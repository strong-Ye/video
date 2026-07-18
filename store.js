/* ════════════════════════════════════════════════════════════════════
 * 电影清单 · 共享数据层 (Store)  — 前端演示版（无后端，纯 localStorage）
 * 由 C端(index.html) 与 B端(admin.html) 共同加载，数据互通。
 * 全局命名空间：window.MWS
 * ════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ───────────── 0. localStorage 键名约定 ───────────── */
  const K = {
    users:     'mw_users',
    movies:    'mw_movies',
    reviews:   'mw_reviews',
    watchlists:'mw_watchlists',
    wl:        'mw_wl',          // 原有状态式清单（想看/在看/已看）
    session:   'mw_session',
    omdbCache: 'mw_omdb',        // OMDb 海报缓存（按 IMDb ID 索引）
    featured:  'mw_featured'     // B端精选电影（首页轮播）
  };

  /* ───────────── 0.1 OMDb API 配置 ───────────── */
  const OMDB_KEY = '569f012b';
  const OMDB_BASE  = 'https://www.omdbapi.com';

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ───────────── 1. 片库种子数据 (~45 部，覆盖 5 页) ─────────────
   * poster: TMDb 完整 URL（国内常被墙，失败回退 SVG 占位）
   * posterLocal: 本地 ./posters/<tmdbId>.jpg（方案C，离线优先）
   * genre: 用于分类着色
   */
  const SEED_MOVIES = [
    {id:1,tmdbId:'tt0111161',title:'肖申克的救赎',enTitle:'The Shawshank Redemption',year:1994,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/9O7gLzmreU0nGkIB6K3BsJbzvNv.jpg',rating:9.7,director:'弗兰克·德拉邦特',cast:'蒂姆·罗宾斯, 摩根·弗里曼',runtime:142,overview:'银行家安迪被误判谋杀，在肖申克监狱凭借才智与毅力完成自我救赎。恐惧让你沦为囚犯，希望让你重获自由。'},
    {id:2,tmdbId:'tt0110912',title:'阿甘正传',enTitle:'Forrest Gump',year:1994,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',rating:9.5,director:'罗伯特·泽米吉斯',cast:'汤姆·汉克斯, 罗宾·怀特',runtime:142,overview:'智商只有75的阿甘用单纯和执着跑过了越战、乒乓外交与创业，活出不平凡的人生。生活像一盒巧克力。'},
    {id:3,tmdbId:'tt0068646',title:'教父',enTitle:'The Godfather',year:1972,genre:'犯罪',poster:'https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',rating:9.3,director:'弗朗西斯·科波拉',cast:'马龙·白兰度, 阿尔·帕西诺',runtime:175,overview:'维托·柯里昂是纽约黑手党家族首领，小儿子迈克尔最终接手掌管，完成惊心动魄的权力更迭。'},
    {id:4,tmdbId:'tt0468569',title:'黑暗骑士',enTitle:'The Dark Knight',year:2008,genre:'动作',poster:'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911B5KuNuMn4HMM.jpg',rating:9.2,director:'克里斯托弗·诺兰',cast:'克里斯蒂安·贝尔, 希斯·莱杰',runtime:152,overview:'蝙蝠侠与戈登联手打击犯罪，小丑的出现将一切拖入混乱深渊。善与恶的较量在暗夜展开。'},
    {id:5,tmdbId:'tt1375666',title:'盗梦空间',enTitle:'Inception',year:2010,genre:'科幻',poster:'https://image.tmdb.org/t/p/w342/9gk7adHYeDWmpK0VQav8B5NHwp9.jpg',rating:9.3,director:'克里斯托弗·诺兰',cast:'莱昂纳多·迪卡普里奥',runtime:148,overview:'柯布是一名盗梦者，接受在目标潜意识中植入想法的任务。层层梦境中现实与幻象的边界逐渐模糊。'},
    {id:6,tmdbId:'tt0133093',title:'黑客帝国',enTitle:'The Matrix',year:1999,genre:'科幻',poster:'https://image.tmdb.org/t/p/w342/f89U3ADr1oiB5zFkYQDGIdH0dcx.jpg',rating:9.1,director:'沃卓斯基姐妹',cast:'基努·里维斯, 劳伦斯·菲什伯恩',runtime:136,overview:'程序员尼奥发现现实世界不过是AI创造的虚拟矩阵，选择吞下红色药丸，开始寻找真相的旅程。'},
    {id:7,tmdbId:'tt0109830',title:'阿飞正传',enTitle:'Days of Being Wild',year:1990,genre:'爱情',poster:'https://image.tmdb.org/t/p/w342/8uNv5LYAw0UzNme3MFzH7SQZFcH.jpg',rating:8.5,director:'王家卫',cast:'张国荣, 张曼玉, 刘嘉玲',runtime:94,overview:'1960年代香港，浪子旭仔周旋于不同女人之间。他说自己是一只无脚的鸟，一生只能飞一次。'},
    {id:8,tmdbId:'tt0816692',title:'星际穿越',enTitle:'Interstellar',year:2014,genre:'科幻',poster:'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',rating:9.4,director:'克里斯托弗·诺兰',cast:'马修·麦康纳, 安妮·海瑟薇',runtime:169,overview:'地球末日临近，前NASA飞行员库珀穿越虫洞为人类寻找新家园。爱是唯一可以超越时间和空间的东西。'},
    {id:9,tmdbId:'tt0169547',title:'美国丽人',enTitle:'American Beauty',year:1999,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/orGz6OuxF1uCKF7oCFXcKeYPt6Y.jpg',rating:8.5,director:'萨姆·门德斯',cast:'凯文·史派西, 安妮特·贝宁',runtime:122,overview:'中年男人莱斯特在看似完美的郊区生活中感到窒息，当他对女儿的同学产生迷恋，开始重新审视生活的意义。'},
    {id:10,tmdbId:'tt0120737',title:'指环王：护戒使者',enTitle:'The Fellowship of the Ring',year:2001,genre:'奇幻',poster:'https://image.tmdb.org/t/p/w342/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',rating:9.1,director:'彼得·杰克逊',cast:'伊利亚·伍德, 伊恩·麦克莱恩',runtime:178,overview:'弗罗多继承至尊魔戒，必须在魔王找回魔戒前将其投入末日火山。护戒远征队踏上了穿越中土世界的危险旅途。'},
    {id:11,tmdbId:'tt0120689',title:'绿里奇迹',enTitle:'The Green Mile',year:1999,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/velWPhVMQeQKcxggNEU8YmIo52R.jpg',rating:8.9,director:'弗兰克·德拉邦特',cast:'汤姆·汉克斯, 迈克·克拉克·邓肯',runtime:189,overview:'冷山监狱死囚牢里的狱警保罗，遇到了拥有神奇治愈力量的死囚约翰·考夫，见证了人性的奇迹。'},
    {id:12,tmdbId:'tt0108052',title:'辛德勒的名单',enTitle:"Schindler's List",year:1993,genre:'战争',poster:'https://image.tmdb.org/t/p/w342/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',rating:9.5,director:'史蒂文·斯皮尔伯格',cast:'连姆·尼森, 本·金斯利',runtime:195,overview:'二战期间，德国商人辛德勒倾尽家财，从纳粹手中挽救了一千一百名犹太人的生命。'},
    {id:13,tmdbId:'tt1675434',title:'触不可及',enTitle:'The Intouchables',year:2011,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/1QU7HKgsQbGpzsJbJK4pAVQV9FZ.jpg',rating:9.3,director:'奥利维埃·纳卡什',cast:'弗朗索瓦·克鲁塞, 奥玛·赛',runtime:112,overview:'瘫痪的贵族富翁与来自贫民窟的护工，跨越阶层与身体的鸿沟，收获了最纯粹的友谊。'},
    {id:14,tmdbId:'tt0041959',title:'天使爱美丽',enTitle:'Amélie',year:2001,genre:'爱情',poster:'https://image.tmdb.org/t/p/w342/4ta3VqjwyFz0LQd1sH3Cv3kLD8v.jpg',rating:8.6,director:'让-皮埃尔·热内',cast:'奥黛丽·塔图, 马修·卡索维茨',runtime:122,overview:'巴黎咖啡馆女侍爱美丽用自己独特的方式默默帮助身边的人，却在自己的爱情面前畏缩不前。'},
    {id:15,tmdbId:'tt0097165',title:'死亡诗社',enTitle:'Dead Poets Society',year:1989,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/ai40gM7SUaGa4miRK2riYMpn7yP.jpg',rating:9.1,director:'彼得·威尔',cast:'罗宾·威廉姆斯, 伊桑·霍克',runtime:128,overview:'文学老师基廷用反传统的教育唤醒了寄宿学校孩子们的灵魂。Carpe Diem——抓住每一天。'},
    {id:16,tmdbId:'tt6751668',title:'寄生虫',enTitle:'Parasite',year:2019,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',rating:8.6,director:'奉俊昊',cast:'宋康昊, 李善均',runtime:132,overview:'穷困的金家一步步渗透进富裕的朴家，两个家庭的命运在阶层鸿沟上剧烈碰撞。'},
    {id:17,tmdbId:'tt0101414',title:'霸王别姬',enTitle:'Farewell My Concubine',year:1993,genre:'爱情',poster:'',rating:9.6,director:'陈凯歌',cast:'张国荣, 张丰毅, 巩俐',runtime:171,overview:'程蝶衣与段小楼半个世纪的悲欢，映照出时代洪流下戏子与人生的痴缠。不疯魔不成活。'},
    {id:18,tmdbId:'tt0120338',title:'泰坦尼克号',enTitle:'Titanic',year:1997,genre:'爱情',poster:'',rating:9.5,director:'詹姆斯·卡梅隆',cast:'莱昂纳多·迪卡普里奥, 凯特·温斯莱特',runtime:194,overview:'穷画家杰克与贵族少女露丝在永不沉没的巨轮上相遇相爱，却迎来那场注定的海难。'},
    {id:19,tmdbId:'tt0110413',title:'这个杀手不太冷',enTitle:'Léon',year:1994,genre:'动作',poster:'',rating:9.4,director:'吕克·贝松',cast:'让·雷诺, 娜塔莉·波特曼',runtime:110,overview:'孤独的职业杀手里昂收留了全家被害的小女孩玛蒂尔达，冷硬外壳下生出温柔的羁绊。'},
    {id:20,tmdbId:'tt0118799',title:'美丽人生',enTitle:'Life Is Beautiful',year:1997,genre:'剧情',poster:'',rating:9.5,director:'罗伯托·贝尼尼',cast:'罗伯托·贝尼尼, 尼可莱塔·布拉斯基',runtime:116,overview:'父亲用善意的谎言为儿子编织出集中营里的游戏，把残酷守护成一生最美的童年。'},
    {id:21,tmdbId:'tt0119698',title:'千与千寻',enTitle:'Spirited Away',year:2001,genre:'动画',poster:'',rating:9.4,director:'宫崎骏',cast:'柊瑠美, 入野自由',runtime:125,overview:'少女千寻误入神灵世界，为救变成猪的父母在汤屋打工，在奇幻冒险中找回自己的名字与勇气。'},
    {id:22,tmdbId:'tt0910970',title:'机器人总动员',enTitle:'WALL·E',year:2008,genre:'动画',poster:'',rating:9.3,director:'安德鲁·斯坦顿',cast:'本·贝尔特, 艾丽莎·奈特',runtime:98,overview:'末世地球清扫机器人瓦力邂逅探测机器人伊娃，一场跨越星海的孤独与爱的旅程就此展开。'},
    {id:23,tmdbId:'tt0117326',title:'海上钢琴师',enTitle:'The Legend of 1900',year:1998,genre:'剧情',poster:'',rating:9.3,director:'朱塞佩·托纳多雷',cast:'蒂姆·罗斯, 比尔·努恩',runtime:165,overview:'被遗弃在远洋客轮上的钢琴天才1900，一生从未踏上陆地，用琴声写尽世间繁华与孤独。'},
    {id:24,tmdbId:'tt0120382',title:'楚门的世界',enTitle:'The Truman Show',year:1998,genre:'剧情',poster:'',rating:9.4,director:'彼得·威尔',cast:'金·凯瑞, 劳拉·琳妮',runtime:103,overview:'楚门的生活是一场被全球直播的真人秀，当他发现真相，便踏上逃离摄影棚、寻找真实的航程。'},
    {id:25,tmdbId:'tt0450259',title:'当幸福来敲门',enTitle:'The Pursuit of Happyness',year:2006,genre:'剧情',poster:'',rating:9.2,director:'加布里埃莱·穆奇诺',cast:'威尔·史密斯, 贾登·史密斯',runtime:117,overview:'破产单身父亲带着儿子辗转流浪，凭借永不放弃的韧劲，从实习生逆袭成为证券经纪人。'},
    {id:26,tmdbId:'tt1187043',title:'三傻大闹宝莱坞',enTitle:'3 Idiots',year:2009,genre:'剧情',poster:'',rating:9.2,director:'拉吉库马尔·希拉尼',cast:'阿米尔·汗, 卡琳娜·卡普',runtime:171,overview:'三个工科生在名校的荒诞求学路，嘲讽填鸭教育，呼唤"追求卓越，成功自会随之而来"。'},
    {id:27,tmdbId:'tt0096283',title:'龙猫',enTitle:'My Neighbor Totoro',year:1988,genre:'动画',poster:'',rating:9.2,director:'宫崎骏',cast:'日高法子, 坂本千夏',runtime:86,overview:'姐妹俩搬进乡间老屋，遇见了毛茸茸的森林精灵龙猫，开启一段温柔奇妙的夏日童话。'},
    {id:28,tmdbId:'tt0378194',title:'放牛班的春天',enTitle:'The Chorus',year:2004,genre:'剧情',poster:'',rating:9.3,director:'克里斯托夫·巴拉蒂',cast:'热拉尔·朱尼奥, 让-巴蒂斯特·莫尼耶',runtime:97,overview:'失意音乐教师用合唱唤醒了问题少年们尘封的天赋，也找回了自己人生的方向。'},
    {id:29,tmdbId:'tt0131325',title:'大话西游之大圣娶亲',enTitle:'A Chinese Odyssey',year:1995,genre:'爱情',poster:'',rating:9.2,director:'刘镇伟',cast:'周星驰, 朱茵',runtime:95,overview:'至尊宝在轮回与宿命里认清真心，一声"曾经有一份真挚的感情"道尽爱而不得的苍凉。'},
    {id:30,tmdbId:'tt0338564',title:'无间道',enTitle:'Infernal Affairs',year:2002,genre:'犯罪',poster:'',rating:9.3,director:'刘伟强, 麦兆辉',cast:'刘德华, 梁朝伟',runtime:101,overview:'警匪互派卧底，身份错位下的生死博弈。想做个好人，却早已回不去。'},
    {id:31,tmdbId:'tt0137523',title:'搏击俱乐部',enTitle:'Fight Club',year:1999,genre:'剧情',poster:'',rating:9.0,director:'大卫·芬奇',cast:'布拉德·皮特, 爱德华·诺顿',runtime:139,overview:'失眠白领与肥皂商人组建地下搏击俱乐部，在失控的狂欢中撕裂出另一个自己。'},
    {id:32,tmdbId:'tt0105323',title:'闻香识女人',enTitle:'Scent of a Woman',year:1992,genre:'剧情',poster:'',rating:9.1,director:'马丁·布莱斯特',cast:'阿尔·帕西诺, 克里斯·奥唐纳',runtime:157,overview:'退役盲眼中校带着少年展开一场恣意的人生谢幕之旅，一段探戈跳尽了生命的优雅与倔强。'},
    {id:33,tmdbId:'tt0050083',title:'十二怒汉',enTitle:'12 Angry Men',year:1957,genre:'悬疑',poster:'',rating:9.4,director:'西德尼·吕美特',cast:'亨利·方达, 李·科布',runtime:96,overview:'陪审团密闭房间里，一人坚持"合理怀疑"，层层拆解所谓铁证，守护了司法的底线。'},
    {id:34,tmdbId:'tt0102926',title:'沉默的羔羊',enTitle:'The Silence of the Lambs',year:1991,genre:'悬疑',poster:'',rating:9.0,director:'乔纳森·戴米',cast:'朱迪·福斯特, 安东尼·霍普金斯',runtime:118,overview:'见习特工克拉丽斯向食人魔医生汉尼拔求助，在心理博弈中追捕另一名连环杀手。'},
    {id:35,tmdbId:'tt0092768',title:'飞越疯人院',enTitle:'One Flew Over the Cuckoo',year:1975,genre:'剧情',poster:'',rating:9.1,director:'米洛斯·福尔曼',cast:'杰克·尼科尔森, 路易丝·弗莱彻',runtime:133,overview:'为逃避劳教装疯入狱的麦克墨菲，用不羁点燃了疯人院里被驯服的灵魂。'},
    {id:36,tmdbId:'tt0109424',title:'重庆森林',enTitle:'Chungking Express',year:1994,genre:'爱情',poster:'',rating:8.8,director:'王家卫',cast:'金城武, 林青霞, 王菲',runtime:102,overview:'两段错位的都市爱情，在便利店与罐头保质期里，贩卖着孤独与温柔的巧合。'},
    {id:37,tmdbId:'tt1129398',title:'让子弹飞',enTitle:'Let the Bullets Fly',year:2010,genre:'喜剧',poster:'',rating:9.0,director:'姜文',cast:'姜文, 葛优, 周润发',runtime:132,overview:'民国乱世，劫匪冒充县长进驻鹅城，与地主恶霸展开一场酣畅淋漓的智斗与狂欢。'},
    {id:38,tmdbId:'tt2906216',title:'疯狂动物城',enTitle:'Zootopia',year:2016,genre:'动画',poster:'',rating:9.2,director:'拜伦·霍华德',cast:'金妮弗·古德温, 杰森·贝特曼',runtime:109,overview:'兔子朱迪与狐狸尼克联手破案，在偏见与梦想交织的动物都市里，证明" anyone can be anything"。'},
    {id:39,tmdbId:'tt2380307',title:'寻梦环游记',enTitle:'Coco',year:2017,genre:'动画',poster:'',rating:9.1,director:'李·昂克里奇',cast:'安东尼·冈萨雷斯, 盖尔·加西亚·贝纳尔',runtime:105,overview:'男孩米格误入亡灵世界，在歌声与记忆里读懂了家族、遗忘与爱的真正含义。'},
    {id:40,tmdbId:'tt1345836',title:'蝙蝠侠：黑暗骑士崛起',enTitle:'The Dark Knight Rises',year:2012,genre:'动作',poster:'',rating:8.8,director:'克里斯托弗·诺兰',cast:'克里斯蒂安·贝尔, 汤姆·哈迪',runtime:165,overview:'八年隐退的布鲁斯·韦恩面对恐怖分子贝恩的威胁，再次披上战袍守护哥谭。'},
    {id:41,tmdbId:'tt0848228',title:'复仇者联盟',enTitle:'The Avengers',year:2012,genre:'动作',poster:'',rating:8.2,director:'乔斯·韦登',cast:'小罗伯特·唐尼, 克里斯·埃文斯',runtime:143,overview:'钢铁侠、美队、雷神、绿巨人等超级英雄首次集结，抵御来自宇宙的入侵。'},
    {id:42,tmdbId:'tt0071562',title:'教父2',enTitle:'The Godfather Part II',year:1974,genre:'犯罪',poster:'',rating:9.0,director:'弗朗西斯·科波拉',cast:'阿尔·帕西诺, 罗伯特·德尼罗',runtime:202,overview:'年轻维托在纽约白手起家，中年迈克尔在权力巅峰走向孤独，两代教父的史诗交叠。'},
    {id:43,tmdbId:'tt0110914',title:'低俗小说',enTitle:'Pulp Fiction',year:1994,genre:'犯罪',poster:'',rating:8.9,director:'昆汀·塔伦蒂诺',cast:'约翰·特拉沃尔塔, 乌玛·瑟曼',runtime:154,overview:'几条暴力又荒诞的故事线被打乱重组，昆汀用黑色幽默拼出一幅后现代crime拼图。'},
    {id:44,tmdbId:'tt0268978',title:'美丽心灵',enTitle:'A Beautiful Mind',year:2001,genre:'剧情',poster:'',rating:9.0,director:'朗·霍华德',cast:'罗素·克劳, 詹妮弗·康纳利',runtime:135,overview:'数学天才纳什在精神分裂的折磨中，凭意志与爱赢下属于自己的人生博弈。'},
    {id:45,tmdbId:'tt0468588',title:'忠犬八公的故事',enTitle:'Hachi',year:2009,genre:'剧情',poster:'',rating:9.4,director:'莱塞·霍尔斯道姆',cast:'理查·基尔, 琼·艾伦',runtime:93,overview:'一只秋田犬用一生在车站等待逝去的主人，把"忠诚"写成了最不动声色的深情。'},
    {id:46,tmdbId:'',title:'五张上将',enTitle:'The Five Generals of Zhang',year:2027,genre:'剧情',poster:'',rating:9.0,director:'张润民',cast:'张国荣, 张丰毅, 张国兵, 张艺谋, 张艺兴, 张润民',runtime:135,overview:'张家人是世界上最大的家族，家族中有"五张上将"代表了张家最大的权力。然而众所周知五张上将却有六个人——这究竟是误会还是有人冒充？著名导演张润民首部执导电影，揭开张家爱恨情仇的终极秘密。'}
  ];

  const RECOMMEND = [
    {id:101,tmdbId:'tt0120689',title:'绿里奇迹',enTitle:'The Green Mile',year:1999,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/velWPhVMQeQKcxggNEU8YmIo52R.jpg',rating:8.9,director:'弗兰克·德拉邦特',reason:'同导演《肖申克》经典之作，同样讲述监狱中的人性光辉'},
    {id:102,tmdbId:'tt0108052',title:'辛德勒的名单',enTitle:"Schindler's List",year:1993,genre:'战争',poster:'https://image.tmdb.org/t/p/w342/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',rating:9.5,director:'史蒂文·斯皮尔伯格',reason:'影史最具影响力的作品之一，深刻而震撼人心'},
    {id:103,tmdbId:'tt1675434',title:'触不可及',enTitle:'The Intouchables',year:2011,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/1QU7HKgsQbGpzsJbJK4pAVQV9FZ.jpg',rating:9.3,director:'奥利维埃·纳卡什',reason:'人性温暖与幽默并存的法式经典，笑泪交织'},
    {id:104,tmdbId:'tt0041959',title:'天使爱美丽',enTitle:'Amélie',year:2001,genre:'爱情',poster:'https://image.tmdb.org/t/p/w342/4ta3VqjwyFz0LQd1sH3Cv3kLD8v.jpg',rating:8.6,director:'让-皮埃尔·热内',reason:'法兰西的浪漫与天马行空的想象力'},
    {id:105,tmdbId:'tt0097165',title:'死亡诗社',enTitle:'Dead Poets Society',year:1989,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/ai40gM7SUaGa4miRK2riYMpn7yP.jpg',rating:9.1,director:'彼得·威尔',reason:'Carpe Diem — 抓住每一天，震撼心灵的师生故事'},
    {id:106,tmdbId:'tt6751668',title:'寄生虫',enTitle:'Parasite',year:2019,genre:'剧情',poster:'https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',rating:8.6,director:'奉俊昊',reason:'奥斯卡最佳影片，阶层隐喻与社会寓言的完美结合'}
  ];

  /* 全量可搜索目录（覆盖种子 + 扩展 + 推荐） */
  function allMovies() {
    const extra = (typeof MOVIES_EXTRA !== 'undefined' && Array.isArray(MOVIES_EXTRA)) ? MOVIES_EXTRA : [];
    return SEED_MOVIES.concat(extra).concat(RECOMMEND);
  }

  /* ───────────── 2. 海报三级回退 ───────────── */
  const GENRE_COLORS = {
    '剧情':['#e50914','#7a0410'], '犯罪':['#5a189a','#240046'], '动作':['#e63946','#780000'],
    '科幻':['#0077b6','#03045e'], '爱情':['#ff6f91','#c9184a'], '动画':['#2a9d8f','#006d77'],
    '喜剧':['#f4a261','#bc6c25'], '悬疑':['#6d597a','#355070'], '战争':['#7f5539','#3c2f2f'],
    '奇幻':['#9d4edd','#5a189a']
  };

  // 生成内联 SVG 占位海报（永远可用，绝不空白）
  function svgPoster(m) {
    const g = GENRE_COLORS[m.genre] || ['#e50914','#0a0a0a'];
    const ch = (m.title || '影')[0];
    const safe = (m.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const year = m.year || '';
    const rating = m.rating || '';
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='342' height='513' viewBox='0 0 342 513'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${g[0]}'/><stop offset='1' stop-color='${g[1]}'/></linearGradient></defs>` +
      `<rect width='342' height='513' fill='url(#g)'/>` +
      `<text x='171' y='250' font-size='150' font-family='Helvetica Neue,Arial' font-weight='900' fill='rgba(255,255,255,.16)' text-anchor='middle'>${ch}</text>` +
      `<text x='171' y='400' font-size='26' font-family='Helvetica Neue,Arial' font-weight='700' fill='#fff' text-anchor='middle'>${safe}</text>` +
      `<text x='171' y='440' font-size='18' font-family='Helvetica Neue,Arial' fill='rgba(255,255,255,.8)' text-anchor='middle'>${year}</text>` +
      `<text x='171' y='480' font-size='20' font-family='Helvetica Neue,Arial' font-weight='900' fill='#f5c518' text-anchor='middle'>★ ${rating}</text>` +
      `</svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // 四级海报回退：本地 → OMDb(IMDb国内可访问) → TMDb → SVG
  function posterCandidates(m) {
    const list = [];
    if (m.tmdbId) list.push('./posters/' + m.tmdbId + '.jpg');   // L1：本地
    if (m.tmdbId) {
      const omdbUrl = getOmdbPoster(m.tmdbId);
      if (omdbUrl) list.push(omdbUrl);                           // L2：OMDb (IMDb CDN)
    }
    if (m.poster) list.push(m.poster);                           // L3：原始 TMDb
    list.push(svgPoster(m));                                     // L4：SVG 占位
    return list;
  }

  /* ───────────── 2.1 OMDb 海报异步加载 + 缓存 ───────────── */
  function getOmdbPosters() { return read(K.omdbCache, {}); }
  function getOmdbPoster(imdbId) {
    const c = getOmdbPosters();
    return c[imdbId] || null;
  }

  async function fetchOmdbPoster(imdbId) {
    if (!imdbId || !imdbId.startsWith('tt')) return null;
    const cache = getOmdbPosters();
    if (cache[imdbId]) return cache[imdbId];  // 已有缓存，直接返回
    try {
      const resp = await fetch(OMDB_BASE + '/?i=' + imdbId + '&apikey=' + OMDB_KEY);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
        cache[imdbId] = data.Poster;
        write(K.omdbCache, cache);
        return data.Poster;
      }
    } catch (e) { /* 网络异常静默失败 */ }
    return null;
  }

  // 脱敏 user 对象，移除 password 字段
  function sanitize(u) { if (!u) return u; const { password, ...safe } = u; return safe; }

  /* ───────────── 3. 用户 / 会话 / 假实名 ───────────── */
  const SURNAMES = '王李张刘陈杨黄赵周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭'.split('');
  const GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超霞平刚桂兰欣怡轩浩然子睿梓涵博文'.split('');

  function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }

  // 确定性生成「假实名」（演示用）
  function fakeRealName(username) {
    const h = hashStr(username || 'user');
    const s = SURNAMES[h % SURNAMES.length];
    const g1 = GIVEN[(h>>3) % GIVEN.length];
    const g2 = GIVEN[(h>>7) % GIVEN.length];
    const idTail = String(h % 10000000000).padStart(10,'0').slice(0,4) + '****';
    return { name: s + g1 + g2, idMask: idTail };
  }

  function seedAdmin() {
    const users = read(K.users, null);
    if (users && users.length) return;
    const adminReal = fakeRealName('admin');
    write(K.users, [{
      id: 0, username: 'admin', password: 'admin', role: 'admin',
      realName: '管理员(演示)', idMask: '****', createdAt: new Date().toISOString()
    }]);
  }

  function getUsers() { seedAdmin(); return read(K.users, []); }
  function saveUsers(u) { write(K.users, u); }

  function register(username, password) {
    username = (username||'').trim(); password = (password||'').trim();
    if (username.length < 2) return { ok:false, msg:'用户名至少 2 个字符' };
    if (password.length < 4) return { ok:false, msg:'密码至少 4 个字符' };
    const users = getUsers();
    if (users.some(u => u.username === username)) return { ok:false, msg:'用户名已存在' };
    const real = fakeRealName(username);
    const user = {
      id: Date.now(), username, password, role:'user',
      realName: real.name, idMask: real.idMask, createdAt: new Date().toISOString()
    };
    users.push(user); saveUsers(users);
    return { ok:true, user: sanitize(user) };
  }

  function login(username, password) {
    username = (username||'').trim(); password = (password||'').trim();
    const users = getUsers();
    const u = users.find(x => x.username === username && x.password === password);
    if (!u) return { ok:false, msg:'用户名或密码错误' };
    write(K.session, { userId: u.id, role: u.role, username: u.username });
    return { ok:true, user: sanitize(u) };
  }

  function logout() { localStorage.removeItem(K.session); }
  function getSession() { return read(K.session, null); }
  function getCurrentUser() {
    const s = getSession(); if (!s) return null;
    return getUsers().find(u => u.id === s.userId) || null;
  }

  /* ───────────── 4. 电影目录（B端管控） ───────────── */
  function getMovies() {
    const m = read(K.movies, null);
    // ★ 合并所有种子数据：SEED_MOVIES + MOVIES_EXTRA
    const allSeeds = SEED_MOVIES.concat(
      (typeof MOVIES_EXTRA !== 'undefined' && Array.isArray(MOVIES_EXTRA)) ? MOVIES_EXTRA : []
    );
    if (m && m.length) {
      const existingIds = new Set(m.map(x => x.id));
      let changed = false;
      allSeeds.forEach(function(seed) {
        if (!existingIds.has(seed.id)) {
          m.push(Object.assign({}, seed));
          changed = true;
        }
      });
      if (changed) write(K.movies, m);
      return m;
    }
    const seed = allSeeds.map(x => Object.assign({}, x));
    write(K.movies, seed); return seed;
  }
  function saveMovies(m) { write(K.movies, m); }
  function addMovie(data) {
    const movies = getMovies();
    const maxId = movies.reduce((a,b)=>Math.max(a,b.id), 1000);
    const movie = Object.assign({ id: maxId+1, tmdbId:'tt_local_'+(maxId+1), poster:'', rating: data.rating||8.0, year: data.year||2024, genre: data.genre||'剧情' }, data);
    movies.push(movie); saveMovies(movies); return movie;
  }
  function deleteMovie(id) {
    const movies = getMovies().filter(m => m.id !== id);
    saveMovies(movies); return movies;
  }

  /* ───────────── 5. 影评（C端写，B端管） ───────────── */
  function getReviews() {
    try {
      const r = read(K.reviews, []);
      // ★ 首次加载时自动播种种子影评
      if (!r || r.length === 0) {
        const seeded = seedReviews();
        write(K.reviews, seeded);
        return seeded;
      }
      // ★ 增量合并新种子影评
      const existingIds = new Set(r.map(function(x) { return x.id; }));
      var changed = false;
      seedReviews().forEach(function(sr) {
        if (!existingIds.has(sr.id)) { r.push(sr); changed = true; }
      });
      if (changed) write(K.reviews, r);
      return r;
    } catch(e) {
      console.error('getReviews error:', e);
      return [];
    }
  }

  // ★ 种子影评：为每部电影生成2-3条模拟评论
  function seedReviews() {
    var reviews = [];
    var id = 3000;
    // 模拟用户（ID 1001-1010：10 个虚拟用户）
    var fakeUsers = [];
    var unames = ['影迷小王','电影控阿杰','文艺青年小雨','动作片狂魔','剧情控老陈','科幻迷星尘','动画爱好者桃桃','悬疑侦探柯柯','喜剧达人阿乐','恐怖片勇者阿胆'];
    for (var u = 0; u < unames.length; u++) {
      fakeUsers.push({ userId: 1001 + u, username: unames[u] });
    }

    // 为种子电影批量生成影评
    SEED_MOVIES.forEach(function(m) {
      if (!m || !m.id) return;
      var count = (m.id % 3) + 1; // 每部电影1-3条
      for (var c = 0; c <= count; c++) {
        var u = fakeUsers[(m.id + c * 7) % fakeUsers.length];
        var ratingBase = m.rating || 8.0;
        var rating = Math.max(1, Math.min(10, Math.round((ratingBase + (c - 1) * 0.8) * 2) / 2));
        if (rating < 5) rating = ratingBase - 1.5;
        var comment = pickComment(m, rating, u.username);
        // 时间分散在过去60天内
        var daysAgo = (m.id * 3 + c * 11) % 60;
        var d = new Date(Date.now() - daysAgo * 86400000);
        reviews.push({
          id: id++, userId: u.userId, username: u.username,
          movieId: m.id, movieTitle: m.title,
          rating: rating, comment: comment,
          createdAt: d.toISOString(), deleted: false
        });
      }
    });
    return reviews;
  }

  // 根据电影和评分生成自然的中文评论
  function pickComment(m, rating, username) {
    var high = [
      '看了三遍还是感动，' + m.director + '导演的功力真的深厚，每一帧都是艺术品。',
      '这才是真正的好电影！' + (m.cast ? m.cast.split(',')[0] : '主演') + '的演技简直炸裂，推荐所有人去看。',
      m.overview ? m.overview.slice(0, 30) + '...这就是我说的那种看完会沉默半小时的电影。' : '余韵悠长，看完久久不能平静，强烈推荐！',
      '经典中的经典，' + m.year + '年能拍出这样的作品实属不易。剧本、摄影、配乐全部在线。',
      m.genre + '类电影的巅峰之作！已经推荐给身边所有朋友了，零差评。',
      '人生必看系列。每次重看都能发现新的细节，这就是好电影的魅力。',
      username + '表示：这片子绝对值满分！节奏把控完美，情绪层层递进。'
    ];
    var mid = [
      '整体还不错，' + m.title + '在' + m.genre + '类型里算中上水平了。可以一看。',
      '给个' + rating + '分吧。导演很有想法，但有些地方节奏稍慢，不够紧凑。',
      (m.cast ? m.cast.split(',')[0] : '主演') + '的表演是亮点，剧情略显老套但瑕不掩瑜。',
      '朋友推荐的，看完感觉还行。有些桥段确实精彩，但整体不如预期那么惊艳。',
      m.genre + '类看过不少，这部算中等偏上。画面很美，故事也完整，但没有特别打动我。',
      '不是我最喜欢的类型，但不得不承认拍得确实好。推荐给喜欢' + m.genre + '的朋友。'
    ];
    var low = [
      '说实话有点失望，可能是期望值太高了。' + m.title + '的评分虚高了。',
      '看了半小时差点睡着，节奏太慢。可能是我欣赏水平不够吧，不太能get到。',
      m.genre + '不是我的菜，被朋友硬拉来看的。' + (m.cast ? m.cast.split(',')[0] : '主演') + '演得还行但剧情一般。',
      rating + '分差不多了。画面不错但故事性偏弱，看完没有太多印象。'
    ];

    var pool = rating >= 8.5 ? high : (rating >= 7 ? mid : low);
    return pool[(m.id * 13 + (rating * 10)) % pool.length];
  }
  function saveReviews(r) { write(K.reviews, r); }
  function addReview(userId, username, movieId, movieTitle, rating, comment) {
    const list = getReviews();
    const now = new Date().toISOString();
    const existing = list.find(r => r.userId === userId && r.movieId === movieId && !r.deleted);
    if (existing) { existing.rating = rating; existing.comment = comment; existing.updatedAt = now; saveReviews(list); return existing; }
    const r = { id: Date.now(), userId, username, movieId, movieTitle, rating, comment, createdAt: now, deleted:false };
    list.push(r); saveReviews(list); return r;
  }
  function updateReview(id, rating, comment) {
    const list = getReviews(); const r = list.find(x => x.id === id);
    if (r) { r.rating = rating; r.comment = comment; r.updatedAt = new Date().toISOString(); saveReviews(list); }
    return r;
  }
  function deleteReview(id, byAdmin) {
    const list = getReviews(); const r = list.find(x => x.id === id);
    if (r) { r.deleted = true; r.deletedAt = new Date().toISOString(); r.deletedBy = byAdmin ? 'admin' : 'self'; saveReviews(list); }
    return list;
  }
  function myReviews(userId) { return getReviews().filter(r => r.userId === userId && !r.deleted); }

  // ★ 获取某部电影的所有公开影评（排除已删除）
  function getMovieReviews(movieId) {
    try {
      return getReviews().filter(function(r) { return r.movieId === movieId && !r.deleted; })
        .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    } catch(e) { console.error('getMovieReviews error:', e); return []; }
  }

  // ★ 获取用户所有影评（含已删除，用于"我的影评"展示删除状态）
  function myAllReviews(userId) {
    try {
      return getReviews().filter(function(r) { return r.userId === userId; })
        .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    } catch(e) { console.error('myAllReviews error:', e); return []; }
  }

  /* ───────────── 6. 自定义影单分类（C端） ───────────── */
  function getWatchlists() { return read(K.watchlists, []); }
  function saveWatchlists(w) { write(K.watchlists, w); }
  function myWatchlists(userId) { return getWatchlists().filter(w => w.userId === userId); }
  function addCategory(userId, category) {
    const list = getWatchlists();
    list.push({ id: Date.now(), userId, category, movieIds: [], createdAt: new Date().toISOString() });
    saveWatchlists(list); return list;
  }
  function removeCategory(id) {
    const list = getWatchlists().filter(w => w.id !== id); saveWatchlists(list); return list;
  }
  function toggleMovieInCategory(catId, movieId) {
    const list = getWatchlists(); const c = list.find(w => w.id === catId);
    if (!c) return list;
    const i = c.movieIds.indexOf(movieId);
    if (i >= 0) c.movieIds.splice(i,1); else c.movieIds.push(movieId);
    saveWatchlists(list); return list;
  }

  /* ───────────── 7. 在线观看链接生成 ───────────── */
  // 为每部电影生成主流平台的搜索/播放直达链接
  const WATCH_PLATFORMS = [
    { id:'tencent',  name:'腾讯视频',  icon:'▶️', color:'#12b7f5',  baseUrl:'https://v.qq.com/x/search/?q=' },
    { id:'iqiyi',    name:'爱奇艺',    icon:'📺', color:'#00be06',  baseUrl:'https://so.iqiyi.com/so/q_' },
    { id:'youku',    name:'优酷',      icon:'🎬', color:'#00a0e9',  baseUrl:'https://so.youku.com/search_video/q_' },
    { id:'bilibili', name:'哔哩哔哩',  icon:'📀', color:'#fb7299',  baseUrl:'https://search.bilibili.com/all?keyword=' },
    { id:'1905',     name:'1905电影网',icon:'🎞️', color:'#c41230',  baseUrl:'https://www.1905.com/search/?q=' },
    { id:'mgtv',     name:'芒果TV',    icon:'🥭', color:'#ff6a00',  baseUrl:'https://so.mgtv.com/so/k-' },
    { id:'youtube',  name:'YouTube',   icon:'🔴', color:'#ff0000',  baseUrl:'https://www.youtube.com/results?search_query=' }
  ];

  function getWatchLinks(movie) {
    if (!movie || !movie.title) return [];
    const query = encodeURIComponent(movie.title);
    return WATCH_PLATFORMS.map(p => ({
      platform: p.name,
      icon: p.icon,
      color: p.color,
      url: p.baseUrl + query + (p.id === 'youtube' ? '+trailer' : '')
    }));
  }

  /* ───────────── 8. 原有状态式清单（快速标记） ───────────── */
  function getWl() { return read(K.wl, []); }
  function saveWl(w) { write(K.wl, w); }

  // 按用户 + 状态筛选影单
  function getWlByStatus(userId, status) {
    return getWl().filter(w => w.userId === userId && w.status === status);
  }

  // 统计各状态数量
  function countWlStatus(userId) {
    const wl = getWl().filter(w => w.userId === userId);
    return {
      want_to_watch: wl.filter(w => w.status === 'want_to_watch').length,
      watching: wl.filter(w => w.status === 'watching').length,
      watched: wl.filter(w => w.status === 'watched').length
    };
  }

  // 按 movieId 查找用户的清单记录
  function getWlItem(userId, movieId) {
    return getWl().find(w => w.userId === userId && w.movieId === movieId) || null;
  }

  /* ───────────── 8.5 首页精选管理（B端选片 → C端轮播） ───────────── */
  // 存储结构: { movieIds: [3, 15, 22], updatedAt: 'ISO...', updatedBy: 'admin' }
  function getFeatured() {
    const f = read(K.featured, null);
    // 如果B端从未设置过精选，自动取评分最高的3部作为默认
    if (!f || !f.movieIds || !f.movieIds.length) {
      const top3 = getMovies().slice().sort((a, b) => b.rating - a.rating).slice(0, 3);
      return { movieIds: top3.map(m => m.id), updatedAt: new Date().toISOString(), updatedBy: 'system', auto: true };
    }
    return f;
  }
  function saveFeatured(movieIds, updatedBy) {
    const f = { movieIds, updatedAt: new Date().toISOString(), updatedBy: updatedBy || 'admin', auto: false };
    write(K.featured, f);
    return f;
  }

  /* ───────────── 9. 对外暴露 ───────────── */
  global.MWS = {
    keys: K,
    SEED_MOVIES, RECOMMEND, allMovies,
    posterCandidates, svgPoster,
    fetchOmdbPoster, getOmdbPoster, getOmdbPosters,
    fakeRealName,
    getUsers, saveUsers, register, login, logout, getSession, getCurrentUser, seedAdmin,
    getMovies, saveMovies, addMovie, deleteMovie,
    getReviews, saveReviews, addReview, updateReview, deleteReview, myReviews, getMovieReviews, myAllReviews,
    getWatchlists, saveWatchlists, myWatchlists, addCategory, removeCategory, toggleMovieInCategory,
    getWatchLinks, WATCH_PLATFORMS,
    getWl, saveWl, getWlByStatus, countWlStatus, getWlItem,
    getFeatured, saveFeatured
  };
})(window);

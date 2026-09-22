/**
 * Characters rendered by the static pages. Passing this list to Google's
 * `text` subset keeps the downloaded webfonts limited to glyphs the site uses.
 * Runtime content (for example, Firebase news) falls back to the system font
 * when it contains a character outside this intentionally small set.
 */
export const festivalGlyphs = Array.from(
	new Set([
		"0123456789ABCDEFGHIJKLMNOPRSTUVWXYabcdefghijklmnopqrstuvwxyz©…※、。々「」〒あいうえおかがきくぐけげこごさざしじすずせぜそぞただちっつづてでとどなにねのはばひびふへべほまみむめもやゆよらりるれろをんアィイウェエォカガキクグケゲコゴサザシジスズセタチッツテデトドナニネバパビピフブベペホボポマミムメャヤュユョラリルレロワン・ー一万三上下不与世中主乃了予事井亜交京人今介仕他付代令以任企休会伝位住佐佑体作使例侑供価係保修個値備催像優元免入全公共内円再写冨凛凰出分切初別利制券刻削前副創力加効動務化北区匿千半協南占原参反収取口古可台号各合吉同名向否吹告和員唯商問善営回団囲図固土圧在地坂埋域基堂報場境変夕外多夜大天太央失奈妙始委姫子字存学宅宇守安完宏定実室宮害容寄寺対専小局屋展属山岡島崎嶋川工市布希帰常幡平年広店度座庭式当彩影役待律後徒得循心必志応急性悠情想意愛慮慶憩成戦戻所手払扱承把投択押拒指挑掃採探掲提握援損携撮擬支改放教数文斐断新施日旺明映春時景晴暁更書最月有朗期木未本朱材村来東松析林校案梨棄森椛検楓業極概様槻標模権横樺橋機櫻次止正歩氏永汰決沙沢治況法注泰活流浜浦浩海消涼深清渚渡温源準滑演澄瀧瀬災点為無爲物特状献玲現理瑠璃環生産用田由甲申画界番発登百的皆盛監目直県真督睿知破確磯示社神祭禁私秋科秒程種稿積究空立章端第等管範篤系約紗紘索細紹終組経結絢綾総緒線縦縮績繋織置美義考者聡職肖育能自舞良色芥花芽若英莉菫葉著蓮薫藤行街表被製複西要見規視覧観解計記設許証話詳認説読誰課講識護谷貝負財貢責資賑賛賞超跡路践車軌転載輝輪辺込近追送通速連進運過遠適遵選郎部配里重野金鈴録鑑長門閉開間関閲阿降限除陵陽隅隆階際隣集音響項順題願食飲館香駅駐験高魅麗齋！＆（）２８：？･𫞎",
		...Array.from("わプ"),
	]),
);

export const latinGlyphs = Array.from(
	"0123456789ABCDEFGHIJKLMNOPRSTUVWXYabcdefghijklmnopqrstuvwxyz",
);

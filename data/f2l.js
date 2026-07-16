/* F2L 41 标准公式（目标槽 = 前右 FR）
   viz 与演示初始态同步生成 */
const _U = "#ffd500", _F = "#009b48";
const F2L_ALGS = [
  // ===== A 基础情形（角白朝顶 / 棱在顶） =====
  { id:1, group:"A", groupName:"基础情形（角白朝顶 / 棱在顶）", name:"棱与角已配对，直接插入", desc:"配对好，右插", moves:"U R U' R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:5,color:_F} } },
  { id:2, group:"A", groupName:"基础情形（角白朝顶 / 棱在顶）", name:"配对好（左手）", desc:"左插", moves:"U' L' U L",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:7,color:_F} } },
  { id:3, group:"A", groupName:"基础情形（角白朝顶 / 棱在顶）", name:"角棱分离，需先配对", desc:"前配对", moves:"U' R U R'",
    viz:{ corner:{pos:6,color:_U}, edge:{pos:5,color:_F} } },
  { id:4, group:"A", groupName:"基础情形（角白朝顶 / 棱在顶）", name:"角棱分离（左）", desc:"左配对", moves:"U L' U' L",
    viz:{ corner:{pos:2,color:_U}, edge:{pos:7,color:_F} } },

  // ===== B 角白朝右侧 / 棱在顶 =====
  { id:5, group:"B", groupName:"角白朝右侧 / 棱在顶", name:"配对同向", desc:"", moves:"U' R U' R' U R U' R'",
    viz:{ edge:{pos:7,color:_F}, slotFilled:true } },
  { id:6, group:"B", groupName:"角白朝右侧 / 棱在顶", name:"棱在对侧", desc:"", moves:"U R' U R U' R' U' R",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:7,color:_F} } },
  { id:7, group:"B", groupName:"角白朝右侧 / 棱在顶", name:"隔开插入", desc:"", moves:"U R U2 R' U R U' R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:1,color:_F} } },
  { id:8, group:"B", groupName:"角白朝右侧 / 棱在顶", name:"翻棱插入", desc:"", moves:"R U' R' U R U' R'",
    viz:{ edge:{pos:5,color:_F}, slotFilled:true } },

  // ===== C 角白朝前 / 棱在顶 =====
  { id:9, group:"C", groupName:"角白朝前 / 棱在顶", name:"直接右插", desc:"", moves:"U' R U R' U R U R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:3,color:_F} } },
  { id:10, group:"C", groupName:"角白朝前 / 棱在顶", name:"三次插", desc:"", moves:"U' R U' R' U R U R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:5,color:_F} } },
  { id:11, group:"C", groupName:"角白朝前 / 棱在顶", name:"绕行插入", desc:"", moves:"U' R' U' R U R' U R",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:7,color:_F} } },
  { id:12, group:"C", groupName:"角白朝前 / 棱在顶", name:"翻转配对", desc:"", moves:"U R U2 R' U' R U R'",
    viz:{ corner:{pos:2,color:_U}, edge:{pos:1,color:_F} } },

  // ===== D 角已在槽 / 棱在顶 =====
  { id:13, group:"D", groupName:"角已在槽 / 棱在顶", name:"角对棱错，重做", desc:"取出重插", moves:"R U' R' U R U' R'",
    viz:{ edge:{pos:5,color:_F}, slotFilled:true } },
  { id:14, group:"D", groupName:"角已在槽 / 棱在顶", name:"角错棱对", desc:"", moves:"R U R' U' R U R'",
    viz:{ edge:{pos:5,color:_F}, slotFilled:true } },
  { id:15, group:"D", groupName:"角已在槽 / 棱在顶", name:"角朝上", desc:"", moves:"U' R U' R' U2 R U' R'",
    viz:{ corner:{pos:8,color:_U}, slotFilled:true } },
  { id:16, group:"D", groupName:"角已在槽 / 棱在顶", name:"角朝侧", desc:"", moves:"U R U2 R' U2 R U' R'",
    viz:{ corner:{pos:0,color:_U}, edge:{pos:5,color:_F} } },

  // ===== E 棱已在槽 / 角在顶 =====
  { id:17, group:"E", groupName:"棱已在槽 / 角在顶", name:"棱翻转，角白朝顶", desc:"", moves:"R U' R' U2 F' U' F",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:5,color:_F} } },
  { id:18, group:"E", groupName:"棱已在槽 / 角在顶", name:"棱翻转，角白朝右", desc:"", moves:"R U R' U2 R U R' U R U' R'",
    viz:{ corner:{pos:0,color:_U}, edge:{pos:7,color:_F} } },
  { id:19, group:"E", groupName:"棱已在槽 / 角在顶", name:"棱翻转，角白朝前", desc:"", moves:"F' U F U2 R U R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:7,color:_F} } },
  { id:20, group:"E", groupName:"棱已在槽 / 角在顶", name:"棱正确，角白朝顶", desc:"", moves:"R U R' U' R U R' U' R U R'",
    viz:{ corner:{pos:8,color:_U}, slotFilled:true } },

  // ===== F 角棱皆在顶（分离） =====
  // 旧式 "U R U2 R' U R' U' R" 逆推会同时打乱 FR+BR，演示高亮错对；改为纯 FR 单对公式
  { id:21, group:"F", groupName:"角棱皆在顶（分离）", name:"角在右后（白朝上），棱在顶后", desc:"", moves:"U R U2 R' U' R U R'",
    viz:{ corner:{pos:2,color:_U}, edge:{pos:1,color:_F} } },
  { id:22, group:"F", groupName:"角棱皆在顶（分离）", name:"角在右后，棱在前", desc:"", moves:"U2 R U R' U R U' R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:3,color:_F} } },
  { id:23, group:"F", groupName:"角棱皆在顶（分离）", name:"角白朝上，棱远离", desc:"", moves:"U R' U' R U R' U' R",
    viz:{ edge:{pos:5,color:_F}, slotFilled:true } },
  { id:24, group:"F", groupName:"角棱皆在顶（分离）", name:"对角分离", desc:"", moves:"U' R U2 R' U2 R U' R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:3,color:_F} } },

  // ===== G 角棱皆在槽（需修正） =====
  { id:25, group:"G", groupName:"角棱皆在槽（需修正）", name:"两者都错位", desc:"取出重配", moves:"R U' R' U R U2 R' U R U' R'",
    viz:{ slotFilled:true } },
  { id:26, group:"G", groupName:"角棱皆在槽（需修正）", name:"角对棱翻", desc:"", moves:"R U R' U' R U R' U' R U R'",
    viz:{ corner:{pos:8,color:_U}, slotFilled:true } },
  { id:27, group:"G", groupName:"角棱皆在槽（需修正）", name:"角翻棱对", desc:"", moves:"R U' R' U' R U R' U' R U R'",
    viz:{ corner:{pos:6,color:_U}, edge:{pos:3,color:_F} } },
  { id:28, group:"G", groupName:"角棱皆在槽（需修正）", name:"完全反位", desc:"", moves:"R U' R' U R U' R' U2 R U' R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:7,color:_F} } },

  // ===== H 角白朝侧 · 扩展 =====
  { id:29, group:"H", groupName:"角白朝侧 · 扩展", name:"右后角朝右", desc:"", moves:"U2 R U' R' U R U' R'",
    viz:{ edge:{pos:3,color:_F}, slotFilled:true } },
  { id:30, group:"H", groupName:"角白朝侧 · 扩展", name:"右后角朝前", desc:"", moves:"U2 R U R' U R U R'",
    viz:{ corner:{pos:6,color:_U}, edge:{pos:1,color:_F} } },
  { id:31, group:"H", groupName:"角白朝侧 · 扩展", name:"左前角朝上", desc:"", moves:"U2 R' U R U' R' U' R",
    viz:{ corner:{pos:2,color:_U}, edge:{pos:5,color:_F} } },
  { id:32, group:"H", groupName:"角白朝侧 · 扩展", name:"左前角朝侧", desc:"", moves:"U R U' R' U2 R U' R'",
    viz:{ corner:{pos:0,color:_U}, slotFilled:true } },

  // ===== I 高效特殊解 =====
  { id:33, group:"I", groupName:"高效特殊解", name:"三步插入", desc:"最短", moves:"R U R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:1,color:_F} } },
  { id:34, group:"I", groupName:"高效特殊解", name:"左三步", desc:"最短", moves:"L' U' L",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:3,color:_F} } },
  { id:35, group:"I", groupName:"高效特殊解", name:"F 面插入", desc:"", moves:"F' U' F",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:3,color:_F} } },
  { id:36, group:"I", groupName:"高效特殊解", name:"F 面正插", desc:"", moves:"F U F'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:1,color:_F} } },
  { id:37, group:"I", groupName:"高效特殊解", name:"M 层辅助", desc:"", moves:"U R U' R' U' F' U F",
    viz:{ edge:{pos:7,color:_F}, slotFilled:true } },
  { id:38, group:"I", groupName:"高效特殊解", name:"双层优化", desc:"角在顶后右、棱在顶右（UR）", moves:"R U' R'",
    viz:{ corner:{pos:6,color:_U}, edge:{pos:7,color:_F} } },
  { id:39, group:"I", groupName:"高效特殊解", name:"角先入棱后", desc:"", moves:"U' R U R' U2 R U R'",
    viz:{ corner:{pos:0,color:_U}, slotFilled:true } },
  { id:40, group:"I", groupName:"高效特殊解", name:"棱先入角后", desc:"", moves:"U F' U' F U' R U R'",
    viz:{ corner:{pos:8,color:_U}, slotFilled:true } },
  { id:41, group:"I", groupName:"高效特殊解", name:"顶层直配后插", desc:"", moves:"R U2 R' U' R U R'",
    viz:{ corner:{pos:8,color:_U}, edge:{pos:5,color:_F} } },
];

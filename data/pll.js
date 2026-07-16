/* ============ PLL 21 公式 ============
   顶层俯视 + 四周侧面色条（与演示初始态一致）
   sides: t后/r右/b前/l左，各 3 色；顶面全黄
=========================================== */
const Y="#ffd500", R="#b71234", G="#009b48", B="#0046ad", O="#ff5800", W="#ffffff";
const PLL_ALGS = [
  // ===== A 仅换角 (Corner Permutation) =====
  { group:"A", groupName:"仅换角 (Corner Permutation)", name:"Aa", desc:"三角循环（逆时针）",
    sides:{t:[R,B,G],r:[O,R,R],b:[O,G,G],l:[B,O,B]},
    moves:"x L2 D2 L' U' L D2 L' U L'" },
  { group:"A", groupName:"仅换角 (Corner Permutation)", name:"Ab", desc:"三角循环（顺时针）",
    sides:{t:[G,B,O],r:[B,R,B],b:[G,G,R],l:[R,O,O]},
    moves:"x R2 D2 R U R' D2 R U' R" },
  { group:"A", groupName:"仅换角 (Corner Permutation)", name:"E", desc:"两组对角对换",
    sides:{t:[O,B,R],r:[G,R,B],b:[O,G,R],l:[G,O,B]},
    moves:"x' L' U L D' L' U' L D L' U' L D' L' U L D" },

  // ===== B 仅换棱 (Edge Permutation) =====
  { group:"B", groupName:"仅换棱 (Edge Permutation)", name:"Ua", desc:"棱三循环（逆时针）",
    sides:{t:[B,B,B],r:[R,O,R],b:[G,R,G],l:[O,G,O]},
    moves:"R U' R U R U R U' R' U' R2" },
  { group:"B", groupName:"仅换棱 (Edge Permutation)", name:"Ub", desc:"棱三循环（顺时针）",
    sides:{t:[B,B,B],r:[R,G,R],b:[G,O,G],l:[O,R,O]},
    moves:"R2 U R U R' U' R' U' R' U R'" },
  { group:"B", groupName:"仅换棱 (Edge Permutation)", name:"H", desc:"两对相对棱对换",
    sides:{t:[B,G,B],r:[R,O,R],b:[G,B,G],l:[O,R,O]},
    moves:"M2 U M2 U2 M2 U M2" },
  { group:"B", groupName:"仅换棱 (Edge Permutation)", name:"Z", desc:"两对相邻棱对换",
    sides:{t:[R,G,R],r:[G,R,G],b:[O,B,O],l:[B,O,B]},
    moves:"M' U M2 U M2 U M' U2 M2" },

  // ===== C 邻角交换类 (Adjacent Corner Swap) =====
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"T", desc:"右邻角换 + 右棱换",
    sides:{t:[B,B,R],r:[G,O,B],b:[G,G,R],l:[O,R,O]},
    moves:"R U R' U' R' F R2 U' R' U' R U R' F'" },
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"F", desc:"角换 + 前后棱换",
    sides:{t:[B,G,R],r:[G,R,B],b:[G,B,R],l:[O,O,O]},
    moves:"R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"Ja", desc:"左侧角棱同换",
    sides:{t:[G,O,O],r:[B,B,B],b:[G,G,R],l:[R,R,O]},
    moves:"L' U' L F L' U' L U L F' L2 U L" },
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"Jb", desc:"右侧角棱同换",
    sides:{t:[R,R,G],r:[O,O,R],b:[O,G,G],l:[B,B,B]},
    moves:"R U R' F' R U R' U' R' F R2 U' R'" },
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"Ra", desc:"R 型 a",
    sides:{t:[R,B,G],r:[O,G,R],b:[O,O,G],l:[B,R,B]},
    moves:"R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { group:"C", groupName:"邻角交换类 (Adjacent Corner Swap)", name:"Rb", desc:"R 型 b",
    sides:{t:[O,O,B],r:[R,B,O],b:[R,G,B],l:[G,R,G]},
    moves:"R2 F R U R U' R' F' R U2 R' U2 R" },

  // ===== D 对角交换类 (Diagonal Corner Swap) =====
  { group:"D", groupName:"对角交换类 (Diagonal Corner Swap)", name:"Y", desc:"对角角换 + 前左棱换",
    sides:{t:[G,O,B],r:[R,R,O],b:[G,G,B],l:[R,B,O]},
    moves:"F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { group:"D", groupName:"对角交换类 (Diagonal Corner Swap)", name:"V", desc:"对角角换 + 相邻棱换",
    sides:{t:[G,R,B],r:[R,B,O],b:[G,G,B],l:[R,O,O]},
    moves:"R' U R' U' R D' R' D R' U D' R2 U' R2 D R2" },
  { group:"D", groupName:"对角交换类 (Diagonal Corner Swap)", name:"Na", desc:"N 型 a（对角+对棱）",
    sides:{t:[B,B,G],r:[O,O,R],b:[B,G,G],l:[O,R,R]},
    moves:"R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { group:"D", groupName:"对角交换类 (Diagonal Corner Swap)", name:"Nb", desc:"N 型 b（对角+对棱）",
    sides:{t:[G,B,B],r:[R,O,O],b:[G,G,B],l:[R,R,O]},
    moves:"R' U R U' R' F' U' F R U R' F R' F' R U' R" },

  // ===== E G 系列 (Corner + Edge 3-cycle) =====
  { group:"E", groupName:"G 系列 (Corner + Edge 3-cycle)", name:"Ga", desc:"G 型 a",
    sides:{t:[B,G,R],r:[G,O,B],b:[G,R,R],l:[O,B,O]},
    moves:"R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { group:"E", groupName:"G 系列 (Corner + Edge 3-cycle)", name:"Gb", desc:"G 型 b",
    sides:{t:[B,O,R],r:[G,G,B],b:[G,B,R],l:[O,R,O]},
    moves:"R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { group:"E", groupName:"G 系列 (Corner + Edge 3-cycle)", name:"Gc", desc:"G 型 c",
    sides:{t:[B,R,R],r:[G,O,B],b:[G,B,R],l:[O,G,O]},
    moves:"R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { group:"E", groupName:"G 系列 (Corner + Edge 3-cycle)", name:"Gd", desc:"G 型 d",
    sides:{t:[B,G,R],r:[G,B,B],b:[G,O,R],l:[O,R,O]},
    moves:"R U R' U' D R2 U' R U' R' U R' U R2 D'" },
];

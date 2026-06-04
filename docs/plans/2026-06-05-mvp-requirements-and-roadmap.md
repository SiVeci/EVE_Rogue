# Unity MVP Requirements and Roadmap Implementation Plan

> **For Codex:** 按本文先完成小闭环，再扩内容。执行开发时保持数据驱动、固定 tick 战斗、移动端可读和资产风险优先。

**Goal:** 做出一版可在手机端验证核心张力的单机 Unity MVP：玩家在安全区选择真实资产出击，经历事件、战斗、撤离和战利品结算，并回到长期资产循环。

**Architecture:** 安全区、远征、战斗、结算和存档分层。战斗模拟、装配计算、资产库存和远征生成使用纯 C# 服务与数据模型，Unity 场景和 UI 只负责表现与输入。

**Tech Stack:** Unity、C#、移动端优先 2.5D 俯视表现、ScriptableObject 或可导入表格数据、单机本地存档、固定 tick 战斗模拟。

---

## 已确认设定摘要

本项目是受 EVE Online 启发的非商业同人手机 roguelike。它不是 MMO，也不是开放世界，而是围绕单舰远征、局外长期资产、出击装配、部分情报、深入或撤离决策展开。

玩家在安全区长期拥有舰船、装备、弹药和无人机。出击后，舰船、已装模块、货舱备用装备、消耗品和本局战利品都进入风险状态；爆船则全部损失，成功撤离或通关才进入有限战利品带回结算。MVP 的核心不是内容量，而是完整闭环：安全区准备、装配、扫描情报、事件跃迁、战斗、撤离、战利品挑选、资产更新。

## 1. MVP 核心目标

MVP 只验证一个问题：资产风险和装配决策能否在短局手机 roguelike 中形成足够清晰、可反复游玩的张力。

必须达成：

- 玩家能感受到“带真实资产出门”的压力。
- 出击前的扫描情报能影响装配选择。
- 装配系统能体现槽位、CPU、能量栅格、电容、防御层和伤害抗性的基本取舍。
- 局内远征能通过事件点串联出“继续深入或撤离”的决策。
- 战斗能用目标、距离、模块开关和资源管理表达简化 EVE 式战术。
- 爆船损失和成功撤离收益都能正确写回安全区资产。
- 所有舰船、装备、敌人、事件和掉落尽量数据驱动，方便后续扩内容。

MVP 不追求：

- 大量舰船装备。
- 完整 EVE 数学模拟。
- 联机同步。
- 产业、制造、市场价格波动。
- 高精度飞行操作。
- 完整美术风格。

## 2. 第一版完整玩家流程

1. 玩家进入安全区主界面。
2. 系统加载本地存档；如果没有存档，创建新档并发放初始资产。
3. 玩家在机库查看已有舰船和基础资产。
4. 玩家可在安全区市场购买 3 艘 MVP 舰船之一，以及基础装备、弹药、无人机或维修服务。
5. 玩家选择一艘可用舰船进入装配界面。
6. 玩家把模块安装到高槽、中槽、低槽和改装件位，并为武器选择弹药。
7. 装配界面实时显示 CPU、能量栅格、电容稳定性、DPS、防御层、抗性、速度、锁定距离等关键指标。
8. 玩家可把备用模块、弹药和无人机放入货舱，并看到货舱容量占用。
9. 玩家查看本次远征扫描报告：危险等级、可能敌对势力、可能伤害类型、敌方抗性倾向、环境异常和收益倾向。
10. 玩家确认出击；系统锁定出击舰船、装配、货舱和随机种子，创建本局远征状态。
11. 玩家进入远征路线，第一个事件点被揭示。
12. 玩家跃迁到事件点，触发普通战斗、打捞、精英、临时站点、撤离窗口或 Boss 等事件。
13. 战斗中玩家锁定目标、切换目标、选择靠近/保持距离/环绕/拉远，并手动开关武器和主动模块。
14. 战斗胜利后，系统把掉落放入本局战利品池，不要求玩家在战斗中整理背包。
15. 每个关键节点后，玩家选择撤离或继续深入。
16. 如果进入临时站点，玩家只能在当前已装模块和货舱备用装备之间换装；不能维修、交易或补给。
17. 如果玩家爆船，出击舰船、装配、货舱和本局战利品全部损失，返回安全区。
18. 如果玩家成功撤离或击败 Boss，进入战利品挑选界面。
19. 玩家在容量、物品体积或稀有度点数限制内选择要带回的战利品。
20. 系统把带回物品、未损失舰船、剩余弹药和货舱物品写回安全区资产。
21. 玩家回到机库，准备下一局。

## 3. 功能范围与明确不做的内容

### MVP 功能范围

- 安全区主界面。
- 机库、资产库存、基础购买/出售。
- 单舰装配与货舱备用装备。
- 3 艘可购买舰船。
- 20 到 30 件装备和消耗品。
- 2 个敌对势力。
- 6 到 10 种敌舰配置。
- 8 到 12 种事件模板。
- 3 到 5 种环境异常。
- 1 条完整远征结构。
- 1 个精英遭遇。
- 1 个 Boss 遭遇。
- 单机固定 tick 战斗。
- 战利品池和撤离结算。
- 本地存档、读档、新档。

### MVP 明确不做

- 不做开放世界星图。
- 不做 MMO、实时 PVP、异步排行榜或局域网合作。
- 不做玩家自由驾驶摇杆和高频弹幕操作。
- 不做局内商人、维修站、补给站。
- 不做完整工业链、蓝图、制造、采矿、科研。
- 不做动态经济和势力声望。
- 不做保险、克隆、技能长线训练。
- 不做复杂 NPC 对话树。
- 不让 AI 直接生成核心平衡数值。
- 不使用受版权限制的正式 EVE 美术资产；MVP 可用占位图和可替换名称。

## 4. 系统模块拆分

### 4.1 安全区

职责：

- 承载局外长期资产经营。
- 提供机库、市场、维修、出击准备入口。
- 展示当前信用点、舰船、装备、消耗品和可出击状态。

边界：

- 安全区不直接计算战斗。
- 安全区不直接修改舰船定义，只操作玩家资产实例。
- 购买、出售和维修通过资产服务完成。

### 4.2 资产库存

职责：

- 管理玩家拥有的舰船实例、装备堆叠、弹药、无人机、信用点。
- 区分定义数据和实例数据。
- 支持出击资产锁定、爆船损失、撤离返还、战利品写入。

边界：

- 不关心 UI 列表如何展示。
- 不关心远征事件如何生成。
- 只提供可靠的增删改查和交易接口。

### 4.3 装配

职责：

- 管理舰船槽位、模块安装、弹药选择、货舱备用装备。
- 校验 CPU、能量栅格、槽位类型、模块需求、货舱容量。
- 计算装配派生属性。

边界：

- 装配计算不依赖 Unity GameObject。
- 装配 UI 只读取装配服务结果。

### 4.4 舰船/装备数据

职责：

- 定义舰船、模块、弹药、无人机、敌舰和掉落表。
- 提供统一 ID、名称、标签、稀有度、体积、价格、图标引用和数值。
- 支持未来从表格导入。

边界：

- 定义数据只描述“这是什么”。
- 玩家拥有多少、损耗多少属于资产库存。

### 4.5 远征生成

职责：

- 根据危险等级、敌对势力、环境异常和随机种子生成路线。
- 生成部分扫描报告。
- 决定事件点类型、深度、奖励倍率和撤离窗口。

边界：

- 不直接执行战斗。
- 不直接写入玩家资产，只创建本局运行状态。

### 4.6 事件点

职责：

- 表示局内每次跃迁到达的节点。
- 根据事件模板执行战斗、打捞、精英、Boss、撤离窗口、临时站点等逻辑。
- 把事件结果交给远征状态或结算服务。

边界：

- 事件点负责触发，不负责长期资产写入。
- 战斗事件委托给战斗系统。

### 4.7 战斗

职责：

- 使用固定 tick 模拟玩家舰船和敌舰。
- 处理锁定、距离意图、模块开关、武器循环、电容、护盾、装甲、结构、伤害和抗性。
- 输出胜利、失败、撤离中断或继续战斗结果。

边界：

- 战斗模拟与画面表现分离。
- 战斗状态只使用本局舰船快照，不直接读写安全区资产。

### 4.8 战利品结算

职责：

- 战斗或事件奖励先进入本局战利品池。
- 成功撤离后提供有限带回选择。
- 爆船时清空本局战利品并通知资产库存删除风险资产。

边界：

- 不负责生成事件。
- 不负责 UI 交互细节，只提供可选物、限制和确认结算接口。

### 4.9 存档

职责：

- 保存玩家长期资产、信用点、已解锁数据、设置和当前版本号。
- 支持创建新档、加载、保存、备份和版本迁移入口。
- 在关键节点自动保存：购买/出售后、出击确认后、远征结束后。

边界：

- 存档保存定义 ID 和实例状态，不保存 ScriptableObject 本体。
- 本局远征状态可做临时保存，但 MVP 优先保证局外资产可靠。

## 5. 每个模块的最小可玩需求

### 安全区

- 一个主界面能进入机库、装配、市场、出击准备。
- 显示信用点、当前选中舰船、装配合法性、维修状态。
- 提供“开始远征”按钮；不合法装配时明确禁用并展示原因。

验收标准：

- 新档玩家能在 2 分钟内从安全区完成首次出击。
- 远征结束后能回到安全区并看到资产变化。

### 资产库存

- 新档初始资产：1 艘基础舰、若干基础模块、弹药、少量信用点。
- 支持购买和出售基础物品。
- 支持舰船实例化，舰船有唯一实例 ID、耐久状态、当前装配和货舱。
- 支持爆船删除风险资产。

验收标准：

- 爆船后该舰船和已携带物品从库存中消失。
- 成功撤离后剩余资产和带回战利品能正确出现。

### 装配

- 支持高槽、中槽、低槽、Rig、无人机舱、弹药、货舱备用装备。
- 支持 CPU 和能量栅格限制。
- 支持模块启用状态、被动属性和主动耗电。
- 提供装配合法性检查和派生属性预览。

验收标准：

- 玩家不能带非法装配出击。
- 更换抗性模块能明显改变扫描报告对应伤害类型的防御表现。

### 舰船/装备数据

- 至少 3 艘舰船：导弹风筝、炮台距离控制、主动坦克或无人机方向。
- 至少 20 件装备：武器、维修、抗性、推进、电容、电子战、Rig、无人机、弹药。
- 至少 2 个敌对势力，每个势力有伤害倾向和抗性倾向。
- 所有数据通过 ID 引用，避免 UI 文本和逻辑硬编码。

验收标准：

- 新增一件装备主要通过数据完成，不需要改战斗核心代码。

### 远征生成

- 生成一条 5 到 7 个阶段的远征路线。
- 每局出发前生成部分扫描报告。
- 路线至少包含普通战斗、打捞、精英、临时站点、撤离窗口、Boss 的组合可能。
- 深度越高，敌人强度和奖励倍率越高。

验收标准：

- 同一随机种子生成结果稳定。
- 扫描报告不揭示全部节点，但能给出有效配装线索。

### 事件点

- 支持事件进入、事件完成、事件失败、事件奖励。
- 普通战斗至少能生成 1 到 3 名敌人。
- 打捞事件能给非战斗奖励。
- 临时站点只允许从货舱备用装备中换装。
- 撤离窗口能结束本局并进入结算。

验收标准：

- 玩家每次跃迁都知道当前事件类型、风险提示和可操作选项。
- 临时站点不能生成免费维修或补给。

### 战斗

- 固定 tick 更新，推荐模拟 tick 10 到 20 Hz，表现层插值。
- 玩家可以锁定目标、切换目标、设置距离意图、开关模块。
- 武器有循环时间、射程、命中或伤害衰减。
- 防御分护盾、装甲、结构三层。
- 伤害至少区分电磁、热能、动能、爆炸四类，并计算抗性。
- 电容用于主动模块和推进/维修等关键能力。

验收标准：

- 同一战斗输入和随机种子能得到可复现结果。
- 玩家能通过关闭模块保电、切换目标、调整距离影响胜负。

### 战利品结算

- 本局战利品池记录所有事件奖励。
- 成功撤离后进入挑选界面。
- MVP 可先采用“货舱容量 + 物品体积”的带回限制。
- 爆船时不进入挑选界面，直接损失本局战利品。

验收标准：

- 玩家不能无限带回战利品。
- 未选择的战利品不会进入长期库存。

### 存档

- 本地 JSON 存档即可，带版本号。
- 保存玩家信用点、舰船实例、物品数量、已装模块、货舱、设置。
- 远征结束后立即保存。
- MVP 至少支持一个存档槽。

验收标准：

- 关闭并重开游戏后，玩家资产保持一致。
- 存档损坏时能回退到备份或提示新建存档。

## 6. Unity 技术架构建议

### 推荐工程结构

初始化 Unity 项目后，建议使用以下目录：

```text
Assets/
  Art/
  Audio/
  Data/
    Ships/
    Modules/
    Enemies/
    Events/
    LootTables/
  Prefabs/
  Scenes/
    Boot.unity
    SafeZone.unity
    Expedition.unity
    Combat.unity
  Scripts/
    Core/
    Data/
    Economy/
    Fitting/
    Expedition/
    Combat/
    Loot/
    Save/
    UI/
  Tests/
    EditMode/
    PlayMode/
```

### 架构分层

- `Data`：ScriptableObject 定义、表格导入结果、统一 ID。
- `Core`：随机数、固定 tick、事件总线、服务注册、通用结果类型。
- `Economy`：资产库存、市场、维修、交易。
- `Fitting`：装配状态、合法性校验、派生属性计算。
- `Expedition`：扫描报告、路线生成、事件运行状态。
- `Combat`：纯 C# 战斗模拟、战斗输入、战斗结果。
- `Loot`：掉落表、战利品池、带回限制。
- `Save`：存档 DTO、序列化、版本迁移。
- `UI`：Unity 视图、Presenter/ViewModel、移动端输入。

### 关键原则

- 战斗模拟不继承 `MonoBehaviour`，便于单元测试和未来联机同步。
- UI 不直接改数据；UI 调服务，服务返回结果和错误原因。
- ScriptableObject 只做定义数据，运行时状态使用普通 C# 类或 DTO。
- 所有可平衡内容使用稳定字符串 ID，如 `ship_light_missile_frigate`。
- 固定 tick 使用独立时钟，渲染层只读取快照。
- 随机数通过 seed 注入，远征生成和战斗掉落可复现。
- 移动端 UI 以列表、标签页、底部操作区和大按钮为主，避免密集右键菜单式交互。

### 场景建议

- `Boot`：初始化服务、加载数据和存档。
- `SafeZone`：机库、市场、装配、出击准备。
- `Expedition`：路线、事件点、撤离决策、临时站点。
- `Combat`：实时战斗表现，可作为独立场景或 Expedition 子状态。

MVP 可以先用单场景多面板降低切换复杂度，但代码边界仍按上面模块分离。

### Unity 版本建议

仓库当前没有 Unity 项目。若准备初始化，建议使用 Unity Hub 创建当前稳定 LTS 项目。根据 Unity 官方发布说明，截至 2026-06-05 可优先考虑 Unity 6.3 LTS；Unity 官方说明 LTS 适合即将锁定生产版本的项目，并且 Unity 6.3 LTS 支持到 2027 年 12 月。

推荐模板：

- `Universal 2D` 或带 URP 的轻量 2D/3D 项目。
- 目标平台先勾选 Android，iOS 可后置。
- 包管理先保持最小：Input System、TextMeshPro、URP、Unity Test Framework。
- 暂不引入 DOTS、Netcode、Addressables、复杂依赖注入框架。

参考：

- Unity 6 release support: https://unity.com/releases/unity-6/support
- Unity LTS support article: https://support.unity.com/hc/en-us/articles/4403332003348-What-is-a-Unity-LTS-Long-Term-Support-version-and-what-can-I-expect-from-it

## 7. 数据结构草案

### 定义数据

```csharp
public enum SlotType
{
    High,
    Medium,
    Low,
    Rig
}

public enum DamageType
{
    EM,
    Thermal,
    Kinetic,
    Explosive
}

public enum ModuleCategory
{
    Weapon,
    ShieldBooster,
    ArmorRepairer,
    Resistance,
    Propulsion,
    Capacitor,
    ElectronicWarfare,
    DroneControl,
    Utility
}
```

```csharp
public sealed class ShipDefinition
{
    public string Id;
    public string DisplayName;
    public int Price;
    public int HighSlots;
    public int MediumSlots;
    public int LowSlots;
    public int RigSlots;
    public float Cpu;
    public float PowerGrid;
    public float CargoCapacity;
    public float DroneBayCapacity;
    public float MaxVelocity;
    public float LockRange;
    public float ShieldHp;
    public float ArmorHp;
    public float HullHp;
    public ResistanceProfile BaseResists;
    public CapacitorProfile Capacitor;
    public List<ShipBonus> Bonuses;
}

public sealed class ModuleDefinition
{
    public string Id;
    public string DisplayName;
    public ModuleCategory Category;
    public SlotType SlotType;
    public int Price;
    public float Volume;
    public float CpuNeed;
    public float PowerGridNeed;
    public bool IsActive;
    public float CycleTime;
    public float CapacitorCost;
    public List<StatModifier> PassiveModifiers;
    public List<ModuleEffect> ActiveEffects;
    public List<string> AllowedAmmoIds;
}

public sealed class AmmoDefinition
{
    public string Id;
    public string DisplayName;
    public int StackSize;
    public float VolumePerUnit;
    public DamageProfile Damage;
    public float RangeModifier;
    public float TrackingModifier;
}
```

### 玩家资产与装配

```csharp
public sealed class PlayerSaveData
{
    public int Version;
    public int Credits;
    public List<ShipInstanceData> Ships;
    public List<ItemStackData> Inventory;
    public string SelectedShipInstanceId;
}

public sealed class ShipInstanceData
{
    public string InstanceId;
    public string ShipDefinitionId;
    public float ShieldHp;
    public float ArmorHp;
    public float HullHp;
    public FittingData Fitting;
    public CargoData Cargo;
}

public sealed class FittingData
{
    public List<FittedModuleData> HighSlots;
    public List<FittedModuleData> MediumSlots;
    public List<FittedModuleData> LowSlots;
    public List<FittedModuleData> RigSlots;
    public List<DroneStackData> Drones;
}

public sealed class FittedModuleData
{
    public string ModuleDefinitionId;
    public string LoadedAmmoDefinitionId;
    public bool Online;
}

public sealed class CargoData
{
    public List<ItemStackData> Items;
}
```

### 远征与事件

```csharp
public sealed class ExpeditionRunState
{
    public string RunId;
    public int Seed;
    public int CurrentDepth;
    public RiskedShipSnapshot PlayerShip;
    public ScanReportData ScanReport;
    public List<EventNodeState> Nodes;
    public LootPoolData LootPool;
    public ExpeditionOutcome Outcome;
}

public sealed class ScanReportData
{
    public int DangerLevel;
    public List<string> PossibleFactionIds;
    public List<DamageType> LikelyIncomingDamage;
    public List<DamageType> LikelyEnemyWeakness;
    public List<string> EnvironmentClueIds;
    public List<string> UnknownSignals;
}

public sealed class EventNodeState
{
    public string NodeId;
    public EventType Type;
    public int Depth;
    public bool Revealed;
    public bool Completed;
    public string EventTemplateId;
}
```

### 战斗

```csharp
public sealed class CombatState
{
    public int Tick;
    public CombatEntityState Player;
    public List<CombatEntityState> Enemies;
    public CombatInputState PlayerInput;
    public CombatResult Result;
}

public sealed class CombatEntityState
{
    public string EntityId;
    public string DefinitionId;
    public float DistanceToPlayer;
    public float Velocity;
    public float ShieldHp;
    public float ArmorHp;
    public float HullHp;
    public CapacitorState Capacitor;
    public ResistanceProfile Resists;
    public List<CombatModuleState> Modules;
    public string CurrentTargetId;
}

public sealed class CombatModuleState
{
    public string ModuleDefinitionId;
    public bool Active;
    public float CycleRemaining;
    public string LoadedAmmoDefinitionId;
}
```

### 战利品与存档约束

```csharp
public sealed class LootPoolData
{
    public List<LootEntryData> Entries;
}

public sealed class LootEntryData
{
    public string ItemDefinitionId;
    public int Quantity;
    public int RarityScore;
    public float TotalVolume;
}

public sealed class LootSelectionRule
{
    public float MaxVolume;
    public int MaxRarityScore;
}
```

MVP 可先只启用 `MaxVolume`，保留 `MaxRarityScore` 字段用于后续扩展。

## 8. 开发里程碑顺序

### 里程碑 0：Unity 项目初始化

目标：

- 在当前仓库内创建 Unity 项目。
- 建立目录、程序集定义、基础测试目录和 Git 忽略规则。
- 确认 Android 构建目标可打开。

完成标志：

- Unity 能打开项目。
- 空场景能运行。
- EditMode 测试能跑通。

### 里程碑 1：数据与存档底座

目标：

- 建立定义数据、玩家存档 DTO、资产库存服务。
- 创建新档初始资产。
- 支持保存和加载。

完成标志：

- 新档、保存、重启加载后的资产一致。
- 单元测试覆盖资产增删、购买、出售。

### 里程碑 2：安全区与资产 UI 原型

目标：

- 做出安全区主界面、机库列表、市场列表。
- 支持购买基础物品和选择舰船。

完成标志：

- 玩家能从空白 UI 进入机库，选择舰船，并看到库存变化。

### 里程碑 3：装配系统

目标：

- 实现槽位安装、卸下、弹药选择、货舱备用装备。
- 实现装配合法性和派生属性计算。

完成标志：

- 玩家能组一套合法装配并准备出击。
- 非法装配不能出击且原因明确。

### 里程碑 4：远征生成与扫描报告

目标：

- 生成一条固定 seed 可复现的远征路线。
- 出击前展示部分扫描情报。

完成标志：

- 每局扫描报告能指导配装，但不完全揭示路线。

### 里程碑 5：事件点与非战斗奖励

目标：

- 实现跃迁、事件节点状态、打捞、撤离窗口、临时站点。

完成标志：

- 玩家能在远征中前进、获得战利品、撤离并结算。

### 里程碑 6：固定 tick 战斗 MVP

目标：

- 实现玩家与敌舰的基础战斗。
- 支持锁定、距离意图、武器循环、主动模块、电容、防御层、抗性。

完成标志：

- 普通战斗、精英和 Boss 都能跑通。
- 爆船和胜利结果正确回传远征状态。

### 里程碑 7：战利品挑选与完整闭环

目标：

- 实现战利品池、撤离挑选、容量限制、资产写回。

完成标志：

- 从安全区出击到回安全区的完整闭环可玩。
- 爆船和成功撤离两条路径都正确。

### 里程碑 8：移动端可读性和首轮平衡

目标：

- 调整触屏 UI、按钮大小、信息层级、战斗节奏和数值。
- 补齐最小内容量。

完成标志：

- 一局控制在 8 到 15 分钟。
- 玩家至少经历 3 次有意义的继续/撤离决策。

## 9. 第一阶段可实现任务清单

以下任务从“仓库完成 Unity 初始化”之后开始执行。当前仓库尚未初始化 Unity 项目，因此这些路径是推荐目标结构。

### Phase 1A：工程骨架

1. 创建 Unity 项目并提交初始工程文件。
2. 创建 `Assets/Scripts/Core`、`Assets/Scripts/Data`、`Assets/Scripts/Economy`、`Assets/Scripts/Fitting`、`Assets/Scripts/Save`。
3. 创建 `Assets/Tests/EditMode`。
4. 创建程序集定义：`EveRogue.Core`、`EveRogue.Gameplay`、`EveRogue.Tests`。
5. 添加 `GameIds` 或统一 ID 校验工具，确保定义数据 ID 不为空且唯一。
6. 写一个 EditMode 测试，验证测试框架可运行。

### Phase 1B：数据定义

1. 创建伤害、防御、槽位、模块分类、事件类型枚举。
2. 创建 `ShipDefinition`、`ModuleDefinition`、`AmmoDefinition`、`DroneDefinition`、`EnemyDefinition` 数据类或 ScriptableObject。
3. 创建 `ResistanceProfile`、`DamageProfile`、`CapacitorProfile`、`StatModifier`。
4. 先用代码或 ScriptableObject 填 1 艘基础舰、5 件基础模块、2 种弹药。
5. 写测试验证基础定义数据能被加载和查询。

### Phase 1C：资产库存与存档

1. 创建 `PlayerSaveData`、`ShipInstanceData`、`ItemStackData`、`FittingData`、`CargoData`。
2. 创建 `InventoryService`，支持增加物品、扣除物品、查询数量。
3. 创建 `ShipInventoryService`，支持创建舰船实例、删除舰船实例、选择当前舰船。
4. 创建 `WalletService` 或在库存服务中支持信用点扣除与增加。
5. 创建 `SaveService`，先用本地 JSON 存取。
6. 写测试覆盖新档创建、购买、出售、保存、加载。

### Phase 1D：装配最小闭环

1. 创建 `FittingService`。
2. 实现安装模块到指定槽位。
3. 实现卸下模块回库存。
4. 实现 CPU 和能量栅格校验。
5. 实现货舱添加和移除备用装备。
6. 实现装配派生属性计算的第一版：HP、抗性、速度、锁定距离、电容、武器 DPS。
7. 写测试覆盖合法装配、槽位不匹配、CPU 超限、能量栅格超限、货舱超量。

### Phase 1E：安全区灰盒 UI

1. 创建 `Boot` 和 `SafeZone` 场景。
2. 创建安全区主界面灰盒：机库、市场、装配、出击准备四个标签页。
3. 机库页显示舰船列表和选中舰船。
4. 市场页显示基础商品和购买按钮。
5. 装配页显示槽位、模块列表、装配合法性。
6. 出击准备页显示当前装配摘要和不可出击原因。
7. 用占位图标和基础文本完成可点击流程。

### Phase 1F：阶段验收

1. 新建存档后进入安全区。
2. 购买一件模块。
3. 选择初始舰船。
4. 安装模块。
5. 放入一件货舱备用装备。
6. 保存并重启，确认资产和装配保持一致。
7. 记录第一阶段缺口，再进入远征与战斗阶段。

## 当前仓库状态与初始化建议

当前仓库尚未包含 Unity 项目结构：没有 `Assets/`、`ProjectSettings/`、`Packages/`。建议下一步不要手写这些目录，而是用 Unity Hub 在当前仓库根目录初始化项目。

推荐初始化方案：

1. 使用 Unity Hub 创建项目，路径选择当前仓库 `G:\GitHub\EVE_Rogue`。
2. 选择 Unity 6.3 LTS 或你本机可用的最新稳定 LTS。
3. 模板选择 `Universal 2D`，如果 Hub 中模板名称不同，则选择带 URP 的 2D 项目。
4. 项目名建议使用 `EVE_Rogue` 或后续原创替换名。
5. 创建完成后补充 Unity `.gitignore`。
6. 打开项目后安装或确认启用 TextMeshPro、Input System、Unity Test Framework。
7. 先提交纯初始化结果，再开始 Phase 1A。

等待确认后再初始化；本次不直接创建 Unity 项目。

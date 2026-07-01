/**
 * 🐋 DeepSeek 余额 & Token — iOS 桌面小组件
 *
 * 适用于 Scriptable App（免费，App Store 可下载）
 *
 * ============ 使用步骤 ============
 * 1. iPhone 上安装 Scriptable
 * 2. 将本文件内容复制到 Scriptable 的新脚本中
 * 3. 修改下方 DEEPSEEK_API_KEY 为你的真实 Key
 * 4. 点击 ▶ 运行测试
 * 5. 回到桌面 → 长按 → 添加 Scriptable 小组件
 * 6. 长按小组件 → 编辑小组件 → 选择本脚本
 *
 * ============ 小组件尺寸 ============
 * - 小型 (2×2)：余额数字
 * - 中型 (4×2)：余额 + 估算可用 Token
 * - 大型 (4×4)：余额 + 估算 Token + 模型费率
 */

// ============ ⚠️ 在这里填入你的 API Key ============
const DEEPSEEK_API_KEY = 'sk-你的API-Key';

// ============ 配置 ============
const CONFIG = {
  primaryColor: '#1a56db',
  accentColor: '#06b6d4',
  balanceUrl: 'https://api.deepseek.com/user/balance',
};

// 模型费率（¥/百万 tokens）
const MODEL_PRICING = {
  'deepseek-v4-flash': { input: 1.0, output: 2.0, label: 'V4 Flash' },
  'deepseek-v4-pro':   { input: 3.0, output: 6.0, label: 'V4 Pro' },
};

// ============ 数据获取 ============

async function fetchBalance() {
  const req = new Request(CONFIG.balanceUrl);
  req.headers = {
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    'Accept': 'application/json',
  };
  const data = await req.loadJSON();
  if (!data?.balance_infos?.length) throw new Error('余额数据异常');
  const info = data.balance_infos[0];
  return {
    isAvailable: data.is_available,
    totalBalance: parseFloat(info.total_balance) || 0,
    grantedBalance: parseFloat(info.granted_balance) || 0,
    toppedUpBalance: parseFloat(info.topped_up_balance) || 0,
    currency: info.currency || 'CNY',
  };
}

/** 根据余额估算可用 Token（按 V4 Pro 输入价） */
function estimateTokens(balance) {
  if (!balance || balance.totalBalance <= 0) return null;
  const price = MODEL_PRICING['deepseek-v4-pro'];
  return {
    total: (balance.totalBalance / price.input) * 1_000_000,
    input: (balance.totalBalance / price.input) * 1_000_000,
    output: (balance.totalBalance / price.output) * 1_000_000,
  };
}

// ============ 格式化 ============

function formatMoney(n) {
  if (n == null || isNaN(n)) return '--';
  return Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTokens(n) {
  if (n == null || isNaN(n)) return '--';
  n = Number(n);
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ============ 颜色 ============

function colors() {
  return {
    bg: Color.dynamic(new Color('#f0f4ff'), new Color('#0f172a')),
    cardBg: Color.dynamic(new Color('#ffffff'), new Color('#1e293b')),
    primaryText: Color.dynamic(new Color('#1e293b'), new Color('#f1f5f9')),
    secondaryText: Color.dynamic(new Color('#64748b'), new Color('#94a3b8')),
    accent: new Color(CONFIG.accentColor),
    primary: new Color(CONFIG.primaryColor),
  };
}

// ============ 构建 Widget ============

async function createWidget() {
  const family = config.widgetFamily || 'medium';
  const c = colors();
  let balance;
  try {
    balance = await fetchBalance();
  } catch (e) {
    return createErrorWidget(c, e.message, family);
  }
  const tokens = estimateTokens(balance);

  switch (family) {
    case 'small':  return createSmallWidget(c, balance);
    case 'large':  return createLargeWidget(c, balance, tokens);
    default:       return createMediumWidget(c, balance, tokens);
  }
}

// ============ 小型 Widget (2×2) ============

function createSmallWidget(c, balance) {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color(CONFIG.primaryColor), new Color(CONFIG.accentColor)];
  gradient.startPoint = new Point(0, 0);
  gradient.endPoint = new Point(1, 1);
  w.backgroundGradient = gradient;
  w.setPadding(14, 14, 14, 14);

  const header = w.addText('🐋 DeepSeek');
  header.font = Font.boldSystemFont(12);
  header.textColor = Color.white();
  header.opacity = 0.9;
  w.addSpacer(4);

  const balRow = w.addStack();
  balRow.layoutHorizontally();
  balRow.bottomAlignContent();
  const yen = balRow.addText('¥');
  yen.font = Font.boldSystemFont(16);
  yen.textColor = Color.white();
  yen.opacity = 0.9;
  balRow.addSpacer(2);
  const amount = balRow.addText(formatMoney(balance.totalBalance));
  amount.font = Font.boldSystemFont(28);
  amount.textColor = Color.white();
  amount.minimumScaleFactor = 0.5;
  w.addSpacer(6);

  const status = w.addText(balance.isAvailable ? '● 账户正常' : '● 账户异常');
  status.font = Font.systemFont(10);
  status.textColor = Color.white();
  status.opacity = balance.isAvailable ? 0.75 : 0.9;
  w.addSpacer();

  const time = w.addText(new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}));
  time.font = Font.systemFont(9);
  time.textColor = Color.white();
  time.opacity = 0.5;
  time.rightAlignText();
  return w;
}

// ============ 中型 Widget (4×2) ★ 推荐 ============

function createMediumWidget(c, balance, tokens) {
  const w = new ListWidget();
  w.backgroundColor = c.bg;
  w.setPadding(16, 18, 14, 18);

  // 顶部
  const topRow = w.addStack();
  topRow.layoutHorizontally();
  const title = topRow.addText('🐋 DeepSeek');
  title.font = Font.boldSystemFont(13);
  title.textColor = c.primaryText;
  topRow.addSpacer();
  const time = topRow.addText(new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}));
  time.font = Font.systemFont(10);
  time.textColor = c.secondaryText;
  w.addSpacer(6);

  // 主卡片：余额 + Token 估算
  const mainCard = w.addStack();
  mainCard.layoutHorizontally();
  mainCard.setPadding(14, 16, 14, 16);
  mainCard.cornerRadius = 16;
  const cardGrad = new LinearGradient();
  cardGrad.colors = [new Color(CONFIG.primaryColor), new Color(CONFIG.accentColor)];
  cardGrad.startPoint = new Point(0, 0);
  cardGrad.endPoint = new Point(1, 1);
  mainCard.backgroundGradient = cardGrad;

  const leftCol = mainCard.addStack();
  leftCol.layoutVertically();
  const balLabel = leftCol.addText('余额');
  balLabel.font = Font.systemFont(11);
  balLabel.textColor = new Color('rgba(255,255,255,0.8)');
  const balRow = leftCol.addStack();
  balRow.layoutHorizontally();
  balRow.bottomAlignContent();
  const yen = balRow.addText('¥');
  yen.font = Font.boldSystemFont(16);
  yen.textColor = Color.white();
  balRow.addSpacer(2);
  const val = balRow.addText(formatMoney(balance.totalBalance));
  val.font = Font.boldSystemFont(32);
  val.textColor = Color.white();
  val.minimumScaleFactor = 0.5;

  mainCard.addSpacer();

  const rightCol = mainCard.addStack();
  rightCol.layoutVertically();
  rightCol.addSpacer(2);
  const tokLabel = rightCol.addText('≈ 可用');
  tokLabel.font = Font.systemFont(10);
  tokLabel.textColor = new Color('rgba(255,255,255,0.7)');
  tokLabel.rightAlignText();
  const tokVal = rightCol.addText(tokens ? formatTokens(tokens.total) : '--');
  tokVal.font = Font.boldSystemFont(18);
  tokVal.textColor = Color.white();
  tokVal.rightAlignText();
  rightCol.addSpacer(4);
  const modelLabel = rightCol.addText('V4 Pro 估算');
  modelLabel.font = Font.systemFont(8);
  modelLabel.textColor = new Color('rgba(255,255,255,0.65)');
  modelLabel.rightAlignText();

  w.addSpacer(6);

  // 底部：充值/赠送
  const bottomRow = w.addStack();
  bottomRow.layoutHorizontally();
  bottomRow.centerAlignContent();

  const topUp = bottomRow.addStack();
  const dot1 = topUp.addText('●');
  dot1.font = Font.systemFont(6);
  dot1.textColor = new Color(CONFIG.primaryColor);
  topUp.addSpacer(3);
  const tLabel = topUp.addText('充值');
  tLabel.font = Font.systemFont(10);
  tLabel.textColor = c.secondaryText;
  topUp.addSpacer(3);
  const tVal = topUp.addText(`¥${formatMoney(balance.toppedUpBalance)}`);
  tVal.font = Font.boldSystemFont(10);
  tVal.textColor = c.primaryText;

  bottomRow.addSpacer(16);

  const grant = bottomRow.addStack();
  const dot2 = grant.addText('●');
  dot2.font = Font.systemFont(6);
  dot2.textColor = new Color(CONFIG.accentColor);
  grant.addSpacer(3);
  const gLabel = grant.addText('赠送');
  gLabel.font = Font.systemFont(10);
  gLabel.textColor = c.secondaryText;
  grant.addSpacer(3);
  const gVal = grant.addText(`¥${formatMoney(balance.grantedBalance)}`);
  gVal.font = Font.boldSystemFont(10);
  gVal.textColor = c.primaryText;

  return w;
}

// ============ 大型 Widget (4×4) ============

function createLargeWidget(c, balance, tokens) {
  const w = new ListWidget();
  w.backgroundColor = c.bg;
  w.setPadding(18, 20, 16, 20);

  // 标题
  const headerRow = w.addStack();
  headerRow.layoutHorizontally();
  const title = headerRow.addText('🐋 DeepSeek 账户');
  title.font = Font.boldSystemFont(15);
  title.textColor = c.primaryText;
  headerRow.addSpacer();
  const status = headerRow.addText(balance.isAvailable ? '● 正常' : '● 异常');
  status.font = Font.systemFont(11);
  status.textColor = balance.isAvailable ? new Color('#059669') : new Color('#ef4444');
  w.addSpacer(10);

  // 余额卡片
  const balCard = w.addStack();
  balCard.layoutHorizontally();
  balCard.setPadding(18, 20, 18, 20);
  balCard.cornerRadius = 20;
  const bg = new LinearGradient();
  bg.colors = [new Color(CONFIG.primaryColor), new Color(CONFIG.accentColor)];
  bg.startPoint = new Point(0, 0);
  bg.endPoint = new Point(1, 1);
  balCard.backgroundGradient = bg;

  const balLeft = balCard.addStack();
  balLeft.layoutVertically();
  const balLabel = balLeft.addText('账户余额');
  balLabel.font = Font.systemFont(12);
  balLabel.textColor = new Color('rgba(255,255,255,0.8)');
  const balRow = balLeft.addStack();
  balRow.layoutHorizontally();
  balRow.bottomAlignContent();
  const yen = balRow.addText('¥');
  yen.font = Font.boldSystemFont(22);
  yen.textColor = Color.white();
  balRow.addSpacer(3);
  const val = balRow.addText(formatMoney(balance.totalBalance));
  val.font = Font.boldSystemFont(40);
  val.textColor = Color.white();
  val.minimumScaleFactor = 0.5;

  balCard.addSpacer();

  const balRight = balCard.addStack();
  balRight.layoutVertically();
  const tItem = balRight.addStack();
  tItem.layoutHorizontally();
  const tDot = tItem.addText('●');
  tDot.font = Font.systemFont(8);
  tDot.textColor = Color.white();
  tItem.addSpacer(4);
  const tLabel = tItem.addText('充值');
  tLabel.font = Font.systemFont(11);
  tLabel.textColor = new Color('rgba(255,255,255,0.7)');
  tItem.addSpacer(4);
  const tV = tItem.addText(`¥${formatMoney(balance.toppedUpBalance)}`);
  tV.font = Font.boldSystemFont(13);
  tV.textColor = Color.white();

  balRight.addSpacer(6);

  const gItem = balRight.addStack();
  gItem.layoutHorizontally();
  const gDot = gItem.addText('○');
  gDot.font = Font.systemFont(8);
  gDot.textColor = Color.white();
  gItem.addSpacer(4);
  const gLabel = gItem.addText('赠送');
  gLabel.font = Font.systemFont(11);
  gLabel.textColor = new Color('rgba(255,255,255,0.7)');
  gItem.addSpacer(4);
  const gV = gItem.addText(`¥${formatMoney(balance.grantedBalance)}`);
  gV.font = Font.boldSystemFont(13);
  gV.textColor = Color.white();

  w.addSpacer(10);

  // Token 估算卡片
  const tokCard = w.addStack();
  tokCard.layoutVertically();
  tokCard.setPadding(16, 18, 16, 18);
  tokCard.cornerRadius = 16;
  tokCard.backgroundColor = c.cardBg;

  const tokTitle = tokCard.addText('📊 可用 Token 估算');
  tokTitle.font = Font.boldSystemFont(13);
  tokTitle.textColor = c.primaryText;
  tokCard.addSpacer(8);

  const tokVal = tokCard.addText(tokens ? formatTokens(tokens.total) : '--');
  tokVal.font = Font.boldSystemFont(32);
  tokVal.textColor = c.primaryText;
  tokCard.addSpacer(4);

  const basedOn = tokCard.addText(`基于 ${MODEL_PRICING['deepseek-v4-pro'].label} 输入价格 ¥${MODEL_PRICING['deepseek-v4-pro'].input}/M tokens 估算`);
  basedOn.font = Font.systemFont(10);
  basedOn.textColor = c.secondaryText;
  tokCard.addSpacer(8);

  // 模型费率
  const ratesTitle = tokCard.addText('模型费率参考 (¥/百万 tokens)');
  ratesTitle.font = Font.boldSystemFont(11);
  ratesTitle.textColor = c.primaryText;
  tokCard.addSpacer(4);

  for (const [name, pricing] of Object.entries(MODEL_PRICING)) {
    const rateRow = tokCard.addStack();
    rateRow.layoutHorizontally();
    const modelName = rateRow.addText(pricing.label);
    modelName.font = Font.systemFont(10);
    modelName.textColor = c.secondaryText;
    rateRow.addSpacer();
    const rates = rateRow.addText(`入 ¥${pricing.input}  出 ¥${pricing.output}`);
    rates.font = Font.systemFont(10);
    rates.textColor = c.secondaryText;
  }

  w.addSpacer(8);

  const footer = w.addText(`更新于 ${new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);
  footer.font = Font.systemFont(9);
  footer.textColor = c.secondaryText;
  footer.centerAlignText();

  return w;
}

// ============ 错误 Widget ============

function createErrorWidget(c, message, family) {
  const w = new ListWidget();
  w.backgroundColor = c.bg;
  w.setPadding(16, 16, 16, 16);
  const icon = w.addText('⚠️');
  icon.font = Font.systemFont(28);
  icon.centerAlignText();
  w.addSpacer(4);
  const err = w.addText(message);
  err.font = Font.systemFont(family === 'small' ? 9 : 11);
  err.textColor = new Color('#ef4444');
  err.centerAlignText();
  if (family !== 'small') {
    w.addSpacer(6);
    const hint = w.addText('请检查 API Key 是否正确');
    hint.font = Font.systemFont(10);
    hint.textColor = c.secondaryText;
    hint.centerAlignText();
  }
  return w;
}

// ============ 入口 ============

const widget = await createWidget();
widget.url = 'https://platform.deepseek.com';
Script.setWidget(widget);
Script.complete();

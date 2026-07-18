import {
  CircleAlert,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";

export type LiveWalletAuthenticationStatusName =
  | "disconnected"
  | "connecting"
  | "challenge_ready"
  | "signing"
  | "authenticating"
  | "restoring"
  | "ready"
  | "rotating"
  | "expired"
  | "revoked"
  | "logging_out"
  | "unavailable"
  | "failed";

export interface LiveWalletSafeIdentity {
  readonly accountType: "AA" | "EOA";
  readonly address: string;
  readonly label: string;
}

export interface LiveWalletSafeDiagnostic {
  readonly code: string;
  readonly traceId?: string;
}

export interface LiveWalletAuthenticationViewState {
  readonly activeAdapterId?: string;
  readonly diagnostic?: LiveWalletSafeDiagnostic;
  readonly status: LiveWalletAuthenticationStatusName;
  readonly wallet?: LiveWalletSafeIdentity;
}

interface LiveWalletAuthenticationStatusProps {
  readonly locale: "en-US" | "zh-CN" | "zh-TW";
  readonly onLogout: () => void;
  readonly onRetry: () => void;
  readonly onRotate: () => void;
  readonly state: LiveWalletAuthenticationViewState;
}

const statusCopy = {
  "en-US": {
    authenticating: "Verifying wallet ownership",
    challenge_ready: "Wallet challenge ready",
    connecting: "Opening wallet",
    disconnected: "Choose a wallet to continue",
    disconnect: "Disconnect wallet",
    expired: "Wallet session expired",
    failed: "Wallet connection failed",
    logging_out: "Disconnecting wallet",
    ready: "Wallet verified",
    reference: "Reference",
    retry: "Try wallet connection again",
    revoked: "Wallet session revoked",
    rotate: "Refresh session",
    rotating: "Refreshing wallet session",
    restoring: "Restoring wallet session",
    signing: "Confirm the wallet signature",
    unavailable: "Wallet service unavailable",
  },
  "zh-CN": {
    authenticating: "正在验证钱包所有权",
    challenge_ready: "钱包验证请求已就绪",
    connecting: "正在打开钱包",
    disconnected: "选择钱包以继续",
    disconnect: "断开钱包",
    expired: "钱包会话已过期",
    failed: "钱包连接失败",
    logging_out: "正在断开钱包",
    ready: "钱包已验证",
    reference: "参考编号",
    retry: "重新尝试钱包连接",
    revoked: "钱包会话已撤销",
    rotate: "刷新会话",
    rotating: "正在刷新钱包会话",
    restoring: "正在恢复钱包会话",
    signing: "请在钱包中确认签名",
    unavailable: "钱包服务暂不可用",
  },
  "zh-TW": {
    authenticating: "正在驗證錢包所有權",
    challenge_ready: "錢包驗證請求已就緒",
    connecting: "正在開啟錢包",
    disconnected: "選擇錢包以繼續",
    disconnect: "中斷錢包",
    expired: "錢包工作階段已過期",
    failed: "錢包連接失敗",
    logging_out: "正在中斷錢包",
    ready: "錢包已驗證",
    reference: "參考編號",
    retry: "重新嘗試錢包連接",
    revoked: "錢包工作階段已撤銷",
    rotate: "重新整理工作階段",
    rotating: "正在重新整理錢包工作階段",
    restoring: "正在恢復錢包工作階段",
    signing: "請在錢包中確認簽名",
    unavailable: "錢包服務暫不可用",
  },
} as const;

const statusStyle: CSSProperties = {
  alignItems: "start",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  minHeight: 88,
  overflowWrap: "anywhere",
  padding: 14,
};

const headingStyle: CSSProperties = {
  alignItems: "center",
  color: "#071426",
  display: "flex",
  fontSize: 14,
  fontWeight: 800,
  gap: 8,
  lineHeight: 1.4,
  margin: 0,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const actionStyle: CSSProperties = {
  alignItems: "center",
  background: "#071426",
  border: "1px solid #071426",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 800,
  gap: 7,
  justifyContent: "center",
  minHeight: 40,
  padding: "8px 12px",
};

const secondaryActionStyle: CSSProperties = {
  ...actionStyle,
  background: "#ffffff",
  borderColor: "#94a3b8",
  color: "#071426",
};

const BUSY_STATES = new Set<LiveWalletAuthenticationStatusName>([
  "connecting",
  "challenge_ready",
  "signing",
  "authenticating",
  "restoring",
  "rotating",
  "logging_out",
]);

const RECOVERY_STATES = new Set<LiveWalletAuthenticationStatusName>([
  "expired",
  "revoked",
  "unavailable",
  "failed",
]);

export const truncateLiveWalletAddress = (address: string): string => {
  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export const LiveWalletAuthenticationStatus = ({
  locale,
  onLogout,
  onRetry,
  onRotate,
  state,
}: LiveWalletAuthenticationStatusProps) => {
  const copy = statusCopy[locale];
  const busy = BUSY_STATES.has(state.status);
  const recoverable = RECOVERY_STATES.has(state.status);
  const Icon = recoverable ? CircleAlert : state.status === "ready" ? ShieldCheck : busy ? LoaderCircle : ShieldCheck;

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      data-auth-state={state.status}
      role="status"
      style={statusStyle}
    >
      <p style={headingStyle}>
        <Icon
          aria-hidden="true"
          className={busy ? "live-wallet-status-spin" : undefined}
          size={18}
        />
        <span>{copy[state.status]}</span>
      </p>

      {state.status === "ready" && state.wallet ? (
        <div style={{ display: "grid", gap: 4 }}>
          <strong>{`Verified ${state.wallet.accountType}`}</strong>
          <span style={{ color: "#475569", fontSize: 13 }}>{state.wallet.label}</span>
          <span style={{ color: "#475569", fontFamily: "monospace", fontSize: 13 }}>
            {truncateLiveWalletAddress(state.wallet.address)}
          </span>
        </div>
      ) : null}

      {recoverable && state.diagnostic?.traceId ? (
        <span style={{ color: "#64748b", fontSize: 12 }}>
          {copy.reference}: {state.diagnostic.traceId}
        </span>
      ) : null}

      {state.status === "ready" ? (
        <div style={actionRowStyle}>
          <button aria-label={copy.rotate} onClick={onRotate} style={secondaryActionStyle} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            {copy.rotate}
          </button>
          <button aria-label={copy.disconnect} onClick={onLogout} style={secondaryActionStyle} type="button">
            <LogOut aria-hidden="true" size={16} />
            {copy.disconnect}
          </button>
        </div>
      ) : null}

      {recoverable ? (
        <button aria-label={copy.retry} onClick={onRetry} style={actionStyle} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          {copy.retry}
        </button>
      ) : null}
    </section>
  );
};

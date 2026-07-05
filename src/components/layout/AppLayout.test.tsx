import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { walletSessions } from "../../domain";
import { AppLayout, type ProductDestinationKey, type SurfaceKey } from "./AppLayout";

const surfaces = [
  { key: "project" as SurfaceKey, label: "Project Console" },
  { key: "user" as SurfaceKey, label: "User App" },
  { key: "admin" as SurfaceKey, label: "Admin/Ops" },
];

const productNavigation = [
  { key: "campaigns" as ProductDestinationKey, label: "Campaigns" },
  { key: "create" as ProductDestinationKey, label: "Create" },
  { key: "analytics" as ProductDestinationKey, label: "Analytics" },
  { key: "export" as ProductDestinationKey, label: "Export" },
];

const renderLayout = (
  overrides: Partial<Parameters<typeof AppLayout>[0]> = {},
) => {
  const onWalletAction = vi.fn();

  render(
    <AppLayout
      activeProductDestination="campaigns"
      activeSurface="project"
      brand="aelf Campaign OS"
      locale="en-US"
      localeLabel="Language"
      onLocaleChange={vi.fn()}
      onProductDestinationChange={vi.fn()}
      onSurfaceChange={vi.fn()}
      onWalletAction={onWalletAction}
      productNavigation={productNavigation}
      shellTitle="Campaign operations shell"
      surfaces={surfaces}
      walletActionLabel="Connect Wallet"
      {...overrides}
    >
      <p>Shell content</p>
    </AppLayout>,
  );

  return { onWalletAction };
};

describe("AppLayout Header wallet controls", () => {
  it("renders the disconnected Header wallet CTA with the locale selector", () => {
    const { onWalletAction } = renderLayout({ walletSession: null });
    const header = screen.getByRole("banner");

    expect(within(header).getByLabelText("Language")).toHaveValue("en-US");
    expect(within(header).getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(within(header).queryByText("AA · Portkey")).not.toBeInTheDocument();

    fireEvent.click(within(header).getByRole("button", { name: "Connect Wallet" }));

    expect(onWalletAction).toHaveBeenCalledTimes(1);
  });

  it("renders a compact connected wallet identity button", () => {
    const { onWalletAction } = renderLayout({
      walletConnectedActionLabel: "Manage wallet connection",
      walletSession: walletSessions[0],
    });
    const header = screen.getByRole("banner");
    const walletButton = within(header).getByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    });

    expect(walletButton).toHaveTextContent("AA · Portkey");
    expect(walletButton).toHaveTextContent("2F4...9aB");
    expect(within(header).queryByRole("button", { name: "Connect Wallet" })).not.toBeInTheDocument();

    fireEvent.click(walletButton);

    expect(onWalletAction).toHaveBeenCalledTimes(1);
  });
});

declare module "*.scss" {
    const content: { [className: string]: string };
    export default content;
}

interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
    };
}
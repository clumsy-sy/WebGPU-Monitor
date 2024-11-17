
// Extend global Navigator interface to include gpu property
interface Navigator {
  gpu?: {
    requestAdapter: any;
  };
}


(() => {
  console.log("[ts]Hooking navigator start ...");
  const originalRequestAdapter = (navigator.gpu as any).requestAdapter;

  (navigator.gpu as any).requestAdapter = async function (...args: any[]) {
    console.log('[ts]requestAdapter called with arguments:', args);

    const adapter = await originalRequestAdapter.apply(this, args);

    if (adapter) {
      const originalRequestDevice = adapter.requestDevice;
      adapter.requestDevice = async function (...deviceArgs: any[]) {
        console.log('[ts]requestDevice called with arguments:', deviceArgs);

        const device = await originalRequestDevice.apply(this, deviceArgs);

        return device;
      };
    }

    return adapter;
  };
})();
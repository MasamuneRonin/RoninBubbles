export default class TokenImageService {
  private fallbackImage: string;
  private imageCache: Map<string, string> = new Map();
  private loadingPromises: Map<string, Promise<string>> = new Map();

  constructor(fallbackImage: string) {
    this.fallbackImage = fallbackImage;
  }

  getTokenImageUrl(tokenAddress: string, callback: (url: string) => void): void {
    // Clean the address
    const cleanAddress = tokenAddress.includes('_') 
      ? tokenAddress.split('_')[1].toLowerCase()
      : tokenAddress.toLowerCase();
      
    // Check cache first
    if (this.imageCache.has(cleanAddress)) {
      callback(this.imageCache.get(cleanAddress) || this.fallbackImage);
      return;
    }
    
    // Avoid duplicate requests
    if (this.loadingPromises.has(cleanAddress)) {
      this.loadingPromises.get(cleanAddress)!.then(url => {
        callback(url);
      }).catch(() => {
        callback(this.fallbackImage);
      });
      return;
    }
    
    // Use our proxy API route instead of direct access
    const imageUrl = `/api/token-image?address=${cleanAddress}`;
    
    // Test if the image loads
    const loadPromise = this.testImageUrl(imageUrl)
      .then(success => {
        const finalUrl = success ? imageUrl : this.fallbackImage;
        this.imageCache.set(cleanAddress, finalUrl);
        return finalUrl;
      })
      .finally(() => {
        // Remove from loading promises
        this.loadingPromises.delete(cleanAddress);
      });
    
    this.loadingPromises.set(cleanAddress, loadPromise);
    
    loadPromise.then(url => {
      callback(url);
    }).catch(() => {
      callback(this.fallbackImage);
    });
  }
  
  private testImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      
      // Set a timeout to avoid hanging
      const timeout = setTimeout(() => {
        img.src = '';  // Cancel loading
        resolve(false);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = url;
    });
  }
}

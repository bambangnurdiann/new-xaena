// global.d.ts

declare global {
    namespace NodeJS {
      interface Global {
        _mongoClientPromise: Promise<any>;
      }
    }
  }
  
  // To make this file a module and avoid the error "cannot be compiled under 'isolatedModules'"
  export {}
  
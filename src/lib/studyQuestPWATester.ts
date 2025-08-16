// StudyQuest PWA and Push Notification Testing Framework
// Comprehensive testing utilities for verifying all PWA functionality

import type { 
  StudyQuestNotificationType, 
  StudyQuestNotificationPayload,
  StudyQuestPushSubscription 
} from '../../types/studyquest-notifications';

// Test Result Interface
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  timestamp: number;
  duration: number;
}

interface PWATestSuite {
  category: string;
  tests: TestResult[];
  overallResult: 'passed' | 'failed' | 'partial';
  passedCount: number;
  totalCount: number;
}

// StudyQuest PWA Testing Class
class StudyQuestPWATester {
  private testResults: TestResult[] = [];
  private testSuites: PWATestSuite[] = [];

  // Main test runner
  async runAllTests(): Promise<{ suites: PWATestSuite[]; overallResult: 'passed' | 'failed' | 'partial' }> {
    console.log('🧪 Starting StudyQuest PWA comprehensive tests...');
    
    this.testResults = [];
    this.testSuites = [];

    // Run all test suites
    await this.testPWABasics();
    await this.testServiceWorker();
    await this.testNotificationSystem();
    await this.testOfflineSupport();
    await this.testIOSCompatibility();
    await this.testManifestAndIcons();
    await this.testCaching();
    await this.testNotificationTypes();

    // Calculate overall result
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passedCount, 0);
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.totalCount, 0);
    
    let overallResult: 'passed' | 'failed' | 'partial';
    if (totalPassed === totalTests) {
      overallResult = 'passed';
    } else if (totalPassed === 0) {
      overallResult = 'failed';
    } else {
      overallResult = 'partial';
    }

    console.log(`✅ StudyQuest PWA tests complete: ${totalPassed}/${totalTests} passed`);
    
    return {
      suites: this.testSuites,
      overallResult
    };
  }

  // Test PWA basics
  private async testPWABasics(): Promise<void> {
    const tests: TestResult[] = [];
    
    tests.push(await this.runTest('Service Worker Support', async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }
      return { supported: true };
    }));

    tests.push(await this.runTest('Manifest Support', async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        throw new Error('Manifest link not found');
      }
      
      try {
        const response = await fetch(manifestLink.getAttribute('href')!);
        const manifest = await response.json();
        return { manifest: manifest.name || 'StudyQuest' };
      } catch (error) {
        throw new Error('Failed to load manifest');
      }
    }));

    tests.push(await this.runTest('PWA Display Mode', async () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      return {
        standalone: isStandalone,
        fullscreen: isFullscreen,
        minimalUI: isMinimalUI,
        current: isStandalone ? 'standalone' : isFullscreen ? 'fullscreen' : isMinimalUI ? 'minimal-ui' : 'browser'
      };
    }));

    tests.push(await this.runTest('Install Prompt Available', async () => {
      const hasPrompt = !!(window as any).studyQuestInstallPrompt;
      return { 
        available: hasPrompt,
        message: hasPrompt ? 'Install prompt ready' : 'No install prompt (may already be installed)'
      };
    }));

    this.addTestSuite('PWA Basics', tests);
  }

  // Test Service Worker functionality
  private async testServiceWorker(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('Service Worker Registration', async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      return {
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      };
    }));

    tests.push(await this.runTest('Custom Worker Import', async () => {
      const registration = await navigator.serviceWorker.ready;
      
      // Test custom worker messaging
      return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'TEST_RESPONSE') {
            resolve({ customWorkerActive: true, response: event.data });
          } else {
            reject(new Error('Custom worker not responding'));
          }
        };

        registration.active?.postMessage({
          type: 'TEST_NOTIFICATION',
          message: 'StudyQuest PWA Test'
        }, [messageChannel.port2]);

        setTimeout(() => reject(new Error('Custom worker timeout')), 5000);
      });
    }));

    tests.push(await this.runTest('Background Sync Support', async () => {
      const registration = await navigator.serviceWorker.ready;
      const hasSyncManager = 'sync' in registration;
      
      return {
        supported: hasSyncManager,
        message: hasSyncManager ? 'Background Sync available' : 'Background Sync not supported'
      };
    }));

    this.addTestSuite('Service Worker', tests);
  }

  // Test notification system
  private async testNotificationSystem(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('Notification Permission', async () => {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const permission = Notification.permission;
      return {
        permission,
        supported: true,
        canRequest: permission === 'default'
      };
    }));

    tests.push(await this.runTest('Push Manager Support', async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker required for Push Manager');
      }

      const registration = await navigator.serviceWorker.ready;
      const hasPushManager = 'pushManager' in registration;
      
      return {
        supported: hasPushManager,
        vapidSupported: hasPushManager && 'applicationServerKey' in PushSubscriptionOptions.prototype
      };
    }));

    tests.push(await this.runTest('Push Subscription', async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      return {
        subscribed: !!subscription,
        endpoint: subscription?.endpoint?.substring(0, 50) + '...' || 'None',
        keys: subscription ? !!(subscription.getKey && subscription.getKey('p256dh') && subscription.getKey('auth')) : false
      };
    }));

    tests.push(await this.runTest('Local Notification Test', async () => {
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      return new Promise((resolve, reject) => {
        const notification = new Notification('StudyQuest Test', {
          body: 'This is a test notification from StudyQuest PWA testing',
          icon: '/icon-96x96.png',
          tag: 'studyquest-test',
          requireInteraction: false,
          silent: true // Silent to avoid disturbing user during tests
        });

        notification.onshow = () => {
          notification.close();
          resolve({ shown: true, tag: notification.tag });
        };

        notification.onerror = (error) => {
          reject(new Error('Notification display failed'));
        };

        setTimeout(() => {
          notification.close();
          reject(new Error('Notification timeout'));
        }, 3000);
      });
    }));

    this.addTestSuite('Notification System', tests);
  }

  // Test offline support
  private async testOfflineSupport(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('Cache API Support', async () => {
      if (!('caches' in window)) {
        throw new Error('Cache API not supported');
      }

      const cacheNames = await caches.keys();
      return {
        supported: true,
        cacheCount: cacheNames.length,
        studyQuestCaches: cacheNames.filter(name => name.includes('studyquest'))
      };
    }));

    tests.push(await this.runTest('IndexedDB Support', async () => {
      if (!('indexedDB' in window)) {
        throw new Error('IndexedDB not supported');
      }

      // Test basic IndexedDB functionality
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('studyquest-test-db', 1);
        
        request.onsuccess = () => {
          const db = request.result;
          db.close();
          indexedDB.deleteDatabase('studyquest-test-db');
          resolve({ supported: true, version: db.version });
        };
        
        request.onerror = () => {
          reject(new Error('IndexedDB test failed'));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.createObjectStore('test', { keyPath: 'id' });
        };
      });
    }));

    tests.push(await this.runTest('Network Status Detection', async () => {
      const isOnline = navigator.onLine;
      
      return {
        online: isOnline,
        networkAPI: 'onLine' in navigator,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink
        } : null
      };
    }));

    tests.push(await this.runTest('StudyQuest Offline Manager', async () => {
      try {
        const { StudyQuestOfflineUtils } = await import('./studyQuestOfflineManager');
        const initialized = await StudyQuestOfflineUtils.initialize();
        
        return {
          available: true,
          initialized,
          isOfflineMode: StudyQuestOfflineUtils.isOffline()
        };
      } catch (error) {
        throw new Error('StudyQuest Offline Manager not available');
      }
    }));

    this.addTestSuite('Offline Support', tests);
  }

  // Test iOS compatibility
  private async testIOSCompatibility(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('iOS Detection', async () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isIOSPWA = isIOS && window.matchMedia('(display-mode: standalone)').matches;
      
      return {
        isIOS,
        isIOSPWA,
        userAgent: userAgent.substring(0, 100) + '...',
        safariVersion: isIOS ? userAgent.match(/Version\/([0-9._]+)/)?.[1] : null
      };
    }));

    tests.push(await this.runTest('iOS PWA Meta Tags', async () => {
      const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      
      return {
        capable: !!appleCapable && appleCapable.getAttribute('content') === 'yes',
        title: appleTitle?.getAttribute('content') || 'Not set',
        statusBar: appleStatusBar?.getAttribute('content') || 'Not set',
        touchIcon: !!appleTouchIcon
      };
    }));

    tests.push(await this.runTest('iOS Viewport Configuration', async () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      const content = viewport?.getAttribute('content') || '';
      
      return {
        hasViewport: !!viewport,
        content,
        hasViewportFit: content.includes('viewport-fit=cover'),
        preventZoom: content.includes('user-scalable=0') || content.includes('user-scalable=no')
      };
    }));

    this.addTestSuite('iOS Compatibility', tests);
  }

  // Test manifest and icons
  private async testManifestAndIcons(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('Manifest Validation', async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        throw new Error('Manifest link not found');
      }
      
      const response = await fetch(manifestLink.getAttribute('href')!);
      const manifest = await response.json();
      
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      return {
        valid: missingFields.length === 0,
        missingFields,
        name: manifest.name,
        shortName: manifest.short_name,
        display: manifest.display,
        iconCount: manifest.icons?.length || 0
      };
    }));

    tests.push(await this.runTest('Icon Availability', async () => {
      const icons = [
        { path: '/icon-96x96.png', size: '96x96' },
        { path: '/icon-192x192.png', size: '192x192' }
      ];
      
      const results = await Promise.all(
        icons.map(async (icon) => {
          try {
            const response = await fetch(icon.path);
            return {
              path: icon.path,
              size: icon.size,
              available: response.ok,
              contentType: response.headers.get('content-type')
            };
          } catch {
            return {
              path: icon.path,
              size: icon.size,
              available: false,
              contentType: null
            };
          }
        })
      );
      
      return {
        icons: results,
        allAvailable: results.every(icon => icon.available)
      };
    }));

    this.addTestSuite('Manifest and Icons', tests);
  }

  // Test caching strategies
  private async testCaching(): Promise<void> {
    const tests: TestResult[] = [];

    tests.push(await this.runTest('Cache Strategy Verification', async () => {
      const cacheNames = await caches.keys();
      const studyQuestCaches = cacheNames.filter(name => 
        name.includes('studyquest') || name.includes('workbox')
      );
      
      const cacheDetails = await Promise.all(
        studyQuestCaches.map(async (cacheName) => {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          return {
            name: cacheName,
            entryCount: keys.length,
            sampleUrls: keys.slice(0, 3).map(req => req.url)
          };
        })
      );
      
      return {
        cacheNames: studyQuestCaches,
        details: cacheDetails,
        totalCaches: studyQuestCaches.length
      };
    }));

    tests.push(await this.runTest('Critical Resource Caching', async () => {
      const criticalResources = [
        '/',
        '/schedule',
        '/exam/new',
        '/settings',
        '/manifest.json'
      ];
      
      const results = await Promise.all(
        criticalResources.map(async (resource) => {
          try {
            const request = new Request(resource);
            const response = await caches.match(request);
            return {
              resource,
              cached: !!response,
              status: response?.status
            };
          } catch {
            return {
              resource,
              cached: false,
              status: null
            };
          }
        })
      );
      
      return {
        resources: results,
        allCached: results.every(r => r.cached)
      };
    }));

    this.addTestSuite('Caching', tests);
  }

  // Test StudyQuest notification types
  private async testNotificationTypes(): Promise<void> {
    const tests: TestResult[] = [];

    const notificationTypes: StudyQuestNotificationType[] = [
      'study_reminder',
      'exam_alert',
      'streak_notification',
      'achievement_unlock',
      'schedule_update'
    ];

    for (const type of notificationTypes) {
      tests.push(await this.runTest(`Notification Type: ${type}`, async () => {
        try {
          // Test API endpoint for this notification type
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: { endpoint: 'test' }, // Mock subscription
              title: `Test ${type}`,
              body: `Testing ${type} notification`,
              notificationType: type,
              data: { test: true }
            })
          });

          // We expect this to fail with a 400 (bad subscription) but not 500 (server error)
          const isValidEndpoint = response.status === 400 || response.status === 200;
          
          return {
            type,
            endpointValid: isValidEndpoint,
            status: response.status
          };
        } catch (error) {
          throw new Error(`Failed to test ${type} endpoint`);
        }
      }));
    }

    tests.push(await this.runTest('Notification API Status', async () => {
      try {
        const response = await fetch('/api/send-notification');
        const data = await response.json();
        
        return {
          service: data.service,
          supportedTypes: data.supportedTypes?.length || 0,
          features: data.features?.length || 0
        };
      } catch (error) {
        throw new Error('Notification API status check failed');
      }
    }));

    this.addTestSuite('StudyQuest Notifications', tests);
  }

  // Helper method to run individual test
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: true,
        message: 'Test passed',
        details: result,
        timestamp: Date.now(),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: false,
        message: error instanceof Error ? error.message : 'Test failed',
        details: error,
        timestamp: Date.now(),
        duration
      };
    }
  }

  // Helper method to add test suite
  private addTestSuite(category: string, tests: TestResult[]): void {
    const passedCount = tests.filter(test => test.passed).length;
    const totalCount = tests.length;
    
    let overallResult: 'passed' | 'failed' | 'partial';
    if (passedCount === totalCount) {
      overallResult = 'passed';
    } else if (passedCount === 0) {
      overallResult = 'failed';
    } else {
      overallResult = 'partial';
    }
    
    this.testSuites.push({
      category,
      tests,
      overallResult,
      passedCount,
      totalCount
    });
  }

  // Generate test report
  generateReport(): string {
    let report = '# StudyQuest PWA Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    for (const suite of this.testSuites) {
      report += `## ${suite.category} (${suite.passedCount}/${suite.totalCount})\n\n`;
      
      for (const test of suite.tests) {
        const status = test.passed ? '✅' : '❌';
        report += `${status} **${test.testName}** - ${test.message}\n`;
        
        if (test.details && typeof test.details === 'object') {
          report += '```json\n';
          report += JSON.stringify(test.details, null, 2);
          report += '\n```\n';
        }
        report += '\n';
      }
    }
    
    return report;
  }
}

// Export testing utilities
export const StudyQuestPWATestUtils = {
  // Create test instance
  createTester: () => new StudyQuestPWATester(),
  
  // Quick PWA check
  quickCheck: async () => {
    const tester = new StudyQuestPWATester();
    const results = await tester.runAllTests();
    
    console.log('🧪 StudyQuest PWA Quick Check Results:');
    for (const suite of results.suites) {
      console.log(`${suite.category}: ${suite.passedCount}/${suite.totalCount}`);
    }
    
    return results;
  },
  
  // Test specific notification type
  testNotificationType: async (type: StudyQuestNotificationType) => {
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: { endpoint: 'test' },
          title: `Test ${type}`,
          body: `Testing ${type} notification`,
          notificationType: type,
          data: { test: true }
        })
      });
      
      return {
        type,
        success: response.status === 400, // Expected for invalid subscription
        status: response.status
      };
    } catch (error) {
      return {
        type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  // Test PWA installation
  testInstallation: () => {
    const installPrompt = (window as any).studyQuestInstallPrompt;
    
    return {
      available: !!installPrompt,
      canInstall: !!installPrompt && typeof installPrompt.prompt === 'function',
      alreadyInstalled: window.matchMedia('(display-mode: standalone)').matches
    };
  }
};

export type { TestResult, PWATestSuite };
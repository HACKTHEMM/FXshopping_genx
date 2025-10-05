import { AnchorManager, KYCInfo } from './anchor-integration';

// Compliance and Security Module
// Handles KYC/AML checks, audit logging, and security best practices

export interface ComplianceConfig {
  enableKYC: boolean;
  enableAML: boolean;
  enableAuditLogging: boolean;
  maxTransactionAmount: number;
  requireApprovalThreshold: number;
  blacklistedAddresses: string[];
  whitelistedAddresses: string[];
  allowedJurisdictions: string[];
  restrictedJurisdictions: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'transaction' | 'kyc_check' | 'aml_check' | 'security_event' | 'compliance_violation';
  userId?: string;
  accountId?: string;
  transactionId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
  resolution?: string;
}

export interface KYCResult {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'expired';
  level: 'basic' | 'enhanced' | 'premium';
  providedDocuments: string[];
  missingDocuments: string[];
  riskScore: number; // 0-100
  lastUpdated: string;
  expiresAt?: string;
  provider: string;
  reference: string;
}

export interface AMLResult {
  status: 'clean' | 'flagged' | 'blocked';
  riskScore: number; // 0-100
  checks: {
    sanctions: boolean;
    pep: boolean; // Politically Exposed Person
    adverse_media: boolean;
    watchlist: boolean;
  };
  flags: string[];
  lastChecked: string;
  provider: string;
}

export interface SecurityEvent {
  type: 'suspicious_activity' | 'failed_authentication' | 'rate_limit_exceeded' | 'invalid_signature';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  accountId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  resolved: boolean;
  action?: string;
}

export class ComplianceManager {
  private config: ComplianceConfig;
  private auditLogs: AuditLogEntry[] = [];
  private kycCache: Map<string, KYCResult> = new Map();
  private amlCache: Map<string, AMLResult> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private anchorManager: AnchorManager;

  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = {
      enableKYC: true,
      enableAML: true,
      enableAuditLogging: true,
      maxTransactionAmount: 1000000, // 1M tokens
      requireApprovalThreshold: 10000, // 10K tokens
      blacklistedAddresses: [],
      whitelistedAddresses: [],
      allowedJurisdictions: ['US', 'EU', 'UK', 'CA', 'AU'],
      restrictedJurisdictions: ['IR', 'KP', 'SY', 'CU'],
      ...config
    };

    this.anchorManager = new AnchorManager();
  }

  /**
   * Check KYC status for an account
   */
  async checkKYCStatus(accountId: string, anchorDomain?: string): Promise<KYCResult> {
    const cacheKey = `${accountId}_${anchorDomain || 'default'}`;
    
    // Check cache first
    if (this.kycCache.has(cacheKey)) {
      const cached = this.kycCache.get(cacheKey)!;
      if (this.isKYCValid(cached)) {
        return cached;
      }
    }

    try {
      let kycResult: KYCResult;

      if (anchorDomain) {
        // Use anchor's KYC service
        const anchorKYC = await this.anchorManager.checkKYCStatus(anchorDomain, accountId);
        kycResult = this.convertAnchorKYCToResult(anchorKYC, anchorDomain);
      } else {
        // Use internal KYC service (mock for demo)
        kycResult = await this.performInternalKYCCheck(accountId);
      }

      // Cache the result
      this.kycCache.set(cacheKey, kycResult);

      // Log the check
      this.logAuditEvent({
        eventType: 'kyc_check',
        accountId,
        details: {
          status: kycResult.status,
          level: kycResult.level,
          riskScore: kycResult.riskScore,
          provider: kycResult.provider
        },
        severity: kycResult.riskScore > 70 ? 'high' : 'medium',
        resolved: false
      });

      return kycResult;
    } catch (error) {
      console.error('KYC check failed:', error);
      
      this.logAuditEvent({
        eventType: 'kyc_check',
        accountId,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high',
        resolved: false
      });

      throw error;
    }
  }

  /**
   * Perform AML check for an account
   */
  async performAMLCheck(accountId: string, transactionAmount?: number): Promise<AMLResult> {
    const cacheKey = accountId;
    
    // Check cache first
    if (this.amlCache.has(cacheKey)) {
      const cached = this.amlCache.get(cacheKey)!;
      if (this.isAMLValid(cached)) {
        return cached;
      }
    }

    try {
      // Perform AML checks (mock implementation)
      const amlResult = await this.performInternalAMLCheck(accountId, transactionAmount);

      // Cache the result
      this.amlCache.set(cacheKey, amlResult);

      // Log the check
      this.logAuditEvent({
        eventType: 'aml_check',
        accountId,
        details: {
          status: amlResult.status,
          riskScore: amlResult.riskScore,
          flags: amlResult.flags,
          provider: amlResult.provider
        },
        severity: amlResult.riskScore > 80 ? 'critical' : amlResult.riskScore > 50 ? 'high' : 'medium',
        resolved: false
      });

      return amlResult;
    } catch (error) {
      console.error('AML check failed:', error);
      
      this.logAuditEvent({
        eventType: 'aml_check',
        accountId,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high',
        resolved: false
      });

      throw error;
    }
  }

  /**
   * Validate transaction compliance
   */
  async validateTransactionCompliance(
    sourceAccount: string,
    targetAccount: string,
    amount: number,
    currency: string,
    transactionType: 'payment' | 'exchange' | 'withdrawal'
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    kycRequired: boolean;
    amlRequired: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;
    let requiresApproval = false;
    let kycRequired = false;
    let amlRequired = false;

    try {
      // Check amount limits
      if (amount > this.config.maxTransactionAmount) {
        reasons.push(`Amount exceeds maximum limit of ${this.config.maxTransactionAmount}`);
        riskScore += 30;
      }

      if (amount >= this.config.requireApprovalThreshold) {
        requiresApproval = true;
        kycRequired = true;
        amlRequired = true;
      }

      // Check blacklisted addresses
      if (this.config.blacklistedAddresses.includes(sourceAccount) || 
          this.config.blacklistedAddresses.includes(targetAccount)) {
        reasons.push('Address is blacklisted');
        riskScore += 100;
      }

      // Check whitelisted addresses (if whitelist is enabled)
      if (this.config.whitelistedAddresses.length > 0) {
        if (!this.config.whitelistedAddresses.includes(sourceAccount) || 
            !this.config.whitelistedAddresses.includes(targetAccount)) {
          reasons.push('Address not in whitelist');
          riskScore += 50;
        }
      }

      // Perform KYC check if required
      if (this.config.enableKYC && kycRequired) {
        const kycResult = await this.checkKYCStatus(sourceAccount);
        if (kycResult.status !== 'approved') {
          reasons.push(`KYC not approved: ${kycResult.status}`);
          riskScore += kycResult.riskScore;
        }
      }

      // Perform AML check if required
      if (this.config.enableAML && amlRequired) {
        const amlResult = await this.performAMLCheck(sourceAccount, amount);
        if (amlResult.status === 'blocked') {
          reasons.push('AML check failed: account blocked');
          riskScore += 100;
        } else if (amlResult.status === 'flagged') {
          reasons.push('AML check flagged: requires review');
          riskScore += amlResult.riskScore;
        }
      }

      // Log compliance check
      this.logAuditEvent({
        eventType: 'transaction',
        accountId: sourceAccount,
        details: {
          targetAccount,
          amount,
          currency,
          transactionType,
          riskScore,
          requiresApproval,
          kycRequired,
          amlRequired,
          reasons
        },
        severity: riskScore > 80 ? 'critical' : riskScore > 50 ? 'high' : 'medium',
        resolved: false
      });

      const allowed = reasons.length === 0 || riskScore < 100;

      return {
        allowed,
        requiresApproval,
        kycRequired,
        amlRequired,
        reasons,
        riskScore
      };
    } catch (error) {
      console.error('Compliance validation failed:', error);
      
      this.logAuditEvent({
        eventType: 'compliance_violation',
        accountId: sourceAccount,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high',
        resolved: false
      });

      throw error;
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'resolved'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.securityEvents.push(securityEvent);

    // Log to audit trail
    this.logAuditEvent({
      eventType: 'security_event',
      accountId: event.accountId,
      details: {
        type: event.type,
        severity: event.severity,
        description: event.description,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      },
      severity: event.severity,
      resolved: false
    });

    // Take action based on severity
    this.handleSecurityEvent(securityEvent);
  }

  /**
   * Handle security event
   */
  private handleSecurityEvent(event: SecurityEvent): void {
    switch (event.severity) {
      case 'critical':
        // Immediate action required
        console.error('🚨 CRITICAL SECURITY EVENT:', event);
        // In production, this would trigger alerts, block accounts, etc.
        break;
      case 'high':
        console.warn('⚠️ HIGH SEVERITY SECURITY EVENT:', event);
        break;
      case 'medium':
        console.log('🔍 MEDIUM SEVERITY SECURITY EVENT:', event);
        break;
      case 'low':
        console.log('ℹ️ LOW SEVERITY SECURITY EVENT:', event);
        break;
    }
  }

  /**
   * Log audit event
   */
  private logAuditEvent(event: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const auditEntry: AuditLogEntry = {
      ...event,
      id: this.generateAuditId(),
      timestamp: new Date().toISOString()
    };

    this.auditLogs.push(auditEntry);

    // In production, this would be stored in a secure database
    console.log('📋 AUDIT LOG:', auditEntry);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(
    filters?: {
      eventType?: string;
      accountId?: string;
      severity?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.eventType) {
        logs = logs.filter(log => log.eventType === filters.eventType);
      }
      if (filters.accountId) {
        logs = logs.filter(log => log.accountId === filters.accountId);
      }
      if (filters.severity) {
        logs = logs.filter(log => log.severity === filters.severity);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        logs = logs.slice(-filters.limit);
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get security events
   */
  getSecurityEvents(
    filters?: {
      type?: string;
      severity?: string;
      resolved?: boolean;
      limit?: number;
    }
  ): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (filters) {
      if (filters.type) {
        events = events.filter(event => event.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(event => event.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        events = events.filter(event => event.resolved === filters.resolved);
      }
      if (filters.limit) {
        events = events.slice(-filters.limit);
      }
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Resolve security event
   */
  resolveSecurityEvent(eventId: string, action: string): boolean {
    const event = this.securityEvents.find(e => e.timestamp === eventId);
    if (event) {
      event.resolved = true;
      event.action = action;
      return true;
    }
    return false;
  }

  /**
   * Update compliance configuration
   */
  updateConfig(newConfig: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.logAuditEvent({
      eventType: 'security_event',
      details: { action: 'config_updated', newConfig },
      severity: 'medium',
      resolved: false
    });
  }

  /**
   * Get compliance configuration
   */
  getConfig(): ComplianceConfig {
    return { ...this.config };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.kycCache.clear();
    this.amlCache.clear();
  }

  // Private helper methods

  private async performInternalKYCCheck(accountId: string): Promise<KYCResult> {
    // Mock KYC implementation
    // In production, this would integrate with real KYC providers
    
    const mockResult: KYCResult = {
      status: 'approved',
      level: 'enhanced',
      providedDocuments: ['passport', 'utility_bill'],
      missingDocuments: [],
      riskScore: Math.floor(Math.random() * 30), // 0-30 for approved
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      provider: 'internal',
      reference: `KYC_${accountId}_${Date.now()}`
    };

    return mockResult;
  }

  private async performInternalAMLCheck(accountId: string, amount?: number): Promise<AMLResult> {
    // Mock AML implementation
    // In production, this would integrate with real AML providers
    
    const mockResult: AMLResult = {
      status: 'clean',
      riskScore: Math.floor(Math.random() * 20), // 0-20 for clean
      checks: {
        sanctions: false,
        pep: false,
        adverse_media: false,
        watchlist: false
      },
      flags: [],
      lastChecked: new Date().toISOString(),
      provider: 'internal'
    };

    // Simulate higher risk for larger amounts
    if (amount && amount > 50000) {
      mockResult.riskScore += 10;
    }

    return mockResult;
  }

  private convertAnchorKYCToResult(anchorKYC: KYCInfo, provider: string): KYCResult {
    return {
      status: anchorKYC.status,
      level: 'basic',
      providedDocuments: anchorKYC.providedFields,
      missingDocuments: anchorKYC.missingFields,
      riskScore: anchorKYC.status === 'approved' ? 10 : 80,
      lastUpdated: new Date().toISOString(),
      provider,
      reference: `ANCHOR_${provider}_${Date.now()}`
    };
  }

  private isKYCValid(kyc: KYCResult): boolean {
    if (!kyc.expiresAt) return true;
    return new Date(kyc.expiresAt) > new Date();
  }

  private isAMLValid(aml: AMLResult): boolean {
    // AML results are valid for 24 hours
    const validUntil = new Date(aml.lastChecked);
    validUntil.setHours(validUntil.getHours() + 24);
    return validUntil > new Date();
  }

  private generateAuditId(): string {
    return `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default compliance manager instance
export const complianceManager = new ComplianceManager();

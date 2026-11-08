/**
 * Legacy Echoes State Machine Engine
 * Direct TypeScript implementation of the Python LegacyEchoesSystem specification.
 * Tracks global gauge, unit tier casualties, 100% threshold trigger, and 3-turn domain duration.
 */

export enum LegacyState {
  CHARGING = 'Charging',
  DOMAIN_ACTIVE = 'DomainActive',
  COOLDOWN = 'Cooldown',
}

export type UnitTier = 'Militia' | 'Standard' | 'Elite' | 'Commander';

export interface LegacyEventResult {
  state: LegacyState;
  gaugePercentage: number;
  domainTriggered: boolean;
  turnsRemaining: number;
  message: string;
}

export class LegacyEchoesSystem {
  public generalName: string;
  public maxCapacity: number;
  public currentGauge: number;
  public state: LegacyState;
  public turnsRemaining: number;
  public readonly domainDuration: number = 3;

  private static readonly CASUALTY_WEIGHTS: Record<UnitTier, number> = {
    Militia: 5.0,
    Standard: 10.0,
    Elite: 20.0,
    Commander: 40.0,
  };

  constructor(generalName: string, maxCapacity: number = 100.0) {
    this.generalName = generalName;
    this.maxCapacity = maxCapacity;
    this.currentGauge = 0.0;
    this.state = LegacyState.CHARGING;
    this.turnsRemaining = 0;
  }

  /**
   * Adds to the Legacy gauge when a unit is eliminated.
   * Different unit tiers award different percentage values to the pool.
   */
  public registerCasualty(unitTier: UnitTier, isAlly: boolean): LegacyEventResult {
    if (this.state !== LegacyState.CHARGING) {
      return this.getStatus('Legacy System is currently locked or active.');
    }

    const multiplier = isAlly ? 0.8 : 1.0;
    const baseWeight = LegacyEchoesSystem.CASUALTY_WEIGHTS[unitTier] ?? 10.0;
    const pointsGained = baseWeight * multiplier;

    this.currentGauge = Math.min(this.maxCapacity, this.currentGauge + pointsGained);

    // Check if threshold reached
    if (this.currentGauge >= this.maxCapacity) {
      return this.triggerDomain();
    }

    return this.getStatus(`Casualty recorded (${unitTier}). +${pointsGained.toFixed(1)} Legacy Points added.`);
  }

  /**
   * Manually or automatically transitions state into active Legacy Domain execution.
   */
  public triggerDomain(): LegacyEventResult {
    this.state = LegacyState.DOMAIN_ACTIVE;
    this.turnsRemaining = this.domainDuration;
    this.currentGauge = this.maxCapacity;

    return {
      state: this.state,
      gaugePercentage: 100.0,
      domainTriggered: true,
      turnsRemaining: this.turnsRemaining,
      message: `LEGACY DOMAIN ACTIVATED! ${this.generalName}'s domain warps the battlefield for ${this.domainDuration} turns!`,
    };
  }

  /**
   * Processes turn updates. If the domain is active, decrements duration.
   * Reverts state to COOLDOWN/CHARGING once the 3-turn window expires.
   */
  public processTurnEnd(): LegacyEventResult {
    if (this.state === LegacyState.DOMAIN_ACTIVE) {
      this.turnsRemaining -= 1;
      if (this.turnsRemaining <= 0) {
        // Expire domain and reset gauge
        this.state = LegacyState.COOLDOWN;
        this.currentGauge = 0.0;
        return {
          state: this.state,
          gaugePercentage: 0.0,
          domainTriggered: false,
          turnsRemaining: 0,
          message: 'Legacy Domain has expired. Battlefield terrain and rules normalize.',
        };
      } else {
        return {
          state: this.state,
          gaugePercentage: 100.0,
          domainTriggered: true,
          turnsRemaining: this.turnsRemaining,
          message: `Legacy Domain active. ${this.turnsRemaining} turn(s) remaining.`,
        };
      }
    } else if (this.state === LegacyState.COOLDOWN) {
      // Transition back to normal charging on next turn cycle
      this.state = LegacyState.CHARGING;
      return this.getStatus('Legacy system recharged and ready to accumulate.');
    }

    return this.getStatus('Normal tactical turn processed.');
  }

  public getStatus(customMsg: string = ''): LegacyEventResult {
    return {
      state: this.state,
      gaugePercentage: (this.currentGauge / this.maxCapacity) * 100,
      domainTriggered: this.state === LegacyState.DOMAIN_ACTIVE,
      turnsRemaining: this.turnsRemaining,
      message: customMsg || `Current Legacy Gauge at ${this.currentGauge.toFixed(1)}%.`,
    };
  }
}

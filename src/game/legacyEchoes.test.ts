import test from 'node:test';
import assert from 'node:assert/strict';
import { LegacyEchoesSystem, LegacyState } from './legacyEchoes';

test('LegacyEchoesSystem: Accumulates casualties with tier weighting and ally penalty', () => {
  const legacy = new LegacyEchoesSystem('Alexander the Great', 100.0);
  assert.equal(legacy.state, LegacyState.CHARGING);
  assert.equal(legacy.currentGauge, 0.0);

  // Standard hostile casualty (+10)
  let res = legacy.registerCasualty('Standard', false);
  assert.equal(res.gaugePercentage, 10.0);
  assert.equal(legacy.state, LegacyState.CHARGING);

  // Elite hostile casualty (+20)
  res = legacy.registerCasualty('Elite', false);
  assert.equal(res.gaugePercentage, 30.0);

  // Commander friendly casualty (+40 * 0.8 = +32)
  res = legacy.registerCasualty('Commander', true);
  assert.equal(res.gaugePercentage, 62.0);

  // Militia hostile casualty (+5)
  res = legacy.registerCasualty('Militia', false);
  assert.equal(res.gaugePercentage, 67.0);
});

test('LegacyEchoesSystem: 100% threshold automatically triggers DomainActive state', () => {
  const legacy = new LegacyEchoesSystem('Alexander the Great', 100.0);
  legacy.registerCasualty('Commander', false); // +40
  legacy.registerCasualty('Commander', false); // +40 (total 80)
  const res = legacy.registerCasualty('Elite', false); // +20 (hits 100!)

  assert.equal(res.domainTriggered, true);
  assert.equal(legacy.state, LegacyState.DOMAIN_ACTIVE);
  assert.equal(legacy.turnsRemaining, 3);
  assert.equal(legacy.currentGauge, 100.0);
});

test('LegacyEchoesSystem: 3-turn countdown reverts state and resets gauge to zero', () => {
  const legacy = new LegacyEchoesSystem('Alexander the Great', 100.0);
  legacy.triggerDomain();
  assert.equal(legacy.state, LegacyState.DOMAIN_ACTIVE);
  assert.equal(legacy.turnsRemaining, 3);

  // Turn 1 ends
  let res = legacy.processTurnEnd();
  assert.equal(legacy.state, LegacyState.DOMAIN_ACTIVE);
  assert.equal(res.turnsRemaining, 2);

  // Turn 2 ends
  res = legacy.processTurnEnd();
  assert.equal(legacy.state, LegacyState.DOMAIN_ACTIVE);
  assert.equal(res.turnsRemaining, 1);

  // Turn 3 ends -> Reverts to COOLDOWN
  res = legacy.processTurnEnd();
  assert.equal(legacy.state, LegacyState.COOLDOWN);
  assert.equal(legacy.currentGauge, 0.0);
  assert.equal(res.domainTriggered, false);

  // Next cycle -> Recharges
  res = legacy.processTurnEnd();
  assert.equal(legacy.state, LegacyState.CHARGING);
});

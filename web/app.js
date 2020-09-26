window.app = (function() {

  let lastTimer = 0;
  /// Steps every 0.3 seconds (9.6 MHz clock is divided by 8,
  /// so the system clock is 1.2 MHz, and it is further divided
  /// by 1024 to get TCNT0 frequency, this is incremented every
  /// 256 cycles)
  let hiTimer = 0;
  let ledIndex = 10;
  const stateDecade = 0;
  const stateMystery = 1;
  const stateOverview = 2;
  const stateBattery = 3;
  let state = 0;
  let prayerIndex = 0;
  let now = 0;
  let flicker = 0;
  let battery = 0; // uint16_t

  function setup() {
    // internal voltage reference, left align result, measure PB4
    ADMUX = 0x64;
    // comparator disabled, free running mode
    ADCSRB = 0;
    // enable ADC, start conversion, auto trigger enabled, clear interrupt flag (by writing 1)
    // disable interrupt, division factor of 8
    ADCSRA = 0xf2;
    TCCR0B = TCCR0B & ~7 | 5;
    ledState.fill(0);
    // wait for first analog conversion to finish
    while (!(ADCSRA&0x10));
  }

  function credo() {
    let index = flicker & 3;
    lightUp(index & 1 | (index & 2) << 2)
  }

  function ourFather() {
    lightUp(10);
  }

  function ourFatherInDecade(decade) {
    let index = flicker & 3;
    if (index < 2) {
      decade <<= 1;
      lightUp(index ? decade : decade + 1);
    } else {
      lightUp(10);
    }
  }

  function hailMary(index) {
    lightUp(index);
  }

  function hailMaryOfThree(index) {
    let side = flicker & 1;
    switch (index) {
      case 0:
        lightUp(side ? 7 : 2);
        break;
      case 1:
        lightUp(side ? 6 : 3);
        break;
      case 2:
        lightUp(side ? 5 : 4);
        break;
    }
  }

  function loop() {
    now = TCNT0;
    flicker = now >> 1;
    if (now < lastTimer) {
      ++hiTimer;
      if ((hiTimer & 7) === 0) {
        ++prayerIndex;
        if (prayerIndex >= 170) prayerIndex = 0;
      }
    }
    lastTimer = now;
    let analog = ADCH << 8 | ADCL; // uint16_t
    if (analog > battery-(battery >> 2)) {
      battery = analog;
    } else {
      // TODO a button must be down
    }
    switch (state) {
      case stateDecade:
        if (prayerIndex < 5) {
          // 0: Credo, 1: Our Father, 2..4: Hail Mary
          switch (prayerIndex) {
            case 0:
              credo();
              break;
            case 1:
              ourFather();
              break;
            default:
              hailMaryOfThree(prayerIndex - 2);
              break;
          }
        } else {
          let cycleIndex = (prayerIndex - 5) % 11;
          if (cycleIndex === 0) {
            ourFatherInDecade((prayerIndex - 5) / 11 % 5);
          } else {
            hailMary(cycleIndex - 1);
          }
        }
        break;
    }
  }

  return { setup, loop, freq: 9.6e6/8 };
})();
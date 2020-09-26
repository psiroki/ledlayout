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

  function setup() {
    TCCR0B = TCCR0B & ~7 | 5;
    ledState.fill(0);
  }

  function credo() {
    let index = (now >> 4) & 3;
    lightUp(index & 1 | (index & 2) << 2)
  }

  function ourFather() {
    lightUp(10);
  }

  function ourFatherInDecade(decade) {
    let flicker = (now >> 4) & 3;
    if (flicker < 2) {
      decade <<= 1;
      lightUp(flicker ? decade : decade + 1);
    } else {
      lightUp(10);
    }
  }

  function hailMary(index) {
    lightUp(index);
  }

  function hailMaryOfThree(index) {
    let flicker = (now >> 4) & 1;
    switch (index) {
      case 0:
        lightUp(flicker ? 7 : 2);
        break;
      case 1:
        lightUp(flicker ? 6 : 3);
        break;
      case 2:
        lightUp(flicker ? 5 : 4);
        break;
    }
  }

  function loop() {
    now = TCNT0;
    if (now < lastTimer) {
      ++hiTimer;
      if ((hiTimer & 7) === 0) {
        ++prayerIndex;
        if (prayerIndex >= 170) prayerIndex = 0;
      }
    }
    lastTimer = now;
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
window.app = (function () {

  let lastTimer = 0;
  /// Steps every 0.3 seconds (9.6 MHz clock is divided by 8,
  /// so the system clock is 1.2 MHz, and it is further divided
  /// by 1024 to get TCNT0 frequency, this is incremented every
  /// 256 cycles)
  let hiTimer = 0;
  let state = 0;
  let prayerIndex = 0;
  let now = 0;
  let flicker = 0;
  let battery = 1; // uint16_t
  let buttonHandled = 0;
  let buttonTime = 0;

  const holdTime = 3;
  const cancelTime = 64;

  const stateDecade = 0;
  const stateMystery = 1;
  const stateOverview = 2;
  const stateBattery = 3;

  const nextButton = 1;
  const resetButton = 2;
  const nextResetButton = 3;
  const prevButton = 4;

  const prayerCount = 170;

  function setup() {
    hiTimer = 0;
    state = 0;
    prayerIndex = 0;
    now = 0;
    flicker = 0;
    battery = 1; // uint16_t
    buttonHandled = 0;
    buttonTime = 0;
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
    while (!(ADCSRA & 0x10));
  }

  function credo() {
    let index = flicker & 3;
    lightUp(index & 1 | (index & 2) << 2)
  }

  function ourFather() {
    lightUp(10);
  }

  function introductoryPrayer() {
    let index = flicker & 3;
    if (index > 2) {
      lightUp(10);
    } else {
      lightUp(index ? 9 : 0);
    }
  }

  function showDecade(decade) {
    decade <<= 1;
    lightUp(flicker & 1 ? decade : decade + 1);
  }

  function showMystery(index) {
    let f = flicker & 3;
    if (index & 1) {
      lightUp(f + 3);
    } else if (index == 0) {
      if (f == 3) {
        lightUp(10);
      } else {
        lightUp(f);
      }
    } else {
      lightUp(f + 7);
    }
  }

  function ourFatherInDecade(decade) {
    let index = flicker & 3;
    if (index < 2) {
      showDecade(decade);
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

  function stepPrayer(delta) {
    if (prayerIndex > 255 - delta) {
      prayerIndex -= (prayerCount - delta);
    } else {
      prayerIndex += delta;
      if (prayerIndex > prayerCount) prayerIndex -= prayerCount;
    }
  }

  function prepButton(id, turn) {
    if (buttonHandled == id && turn) {
      if (buttonTime < cancelTime) {
        ++buttonTime;
      } else {
        // button held for 3 seconds, cancel button
        buttonHandled = 0;
        buttonTime = 0;
        // let the battery value refresh itself
        battery = 0;
      }
    } else if (buttonHandled < id) {
      buttonHandled = id;
      buttonTime = 0;
    }
  }

  function showBattery() {
    let bat10 = battery < 35500 ? 0 :
      battery >= 41500 ? 9 : (battery - 35500) / 600 | 0;
    lightUp(hiTimer & 4 ? 11 : bat10);
  }

  function loop() {
    now = TCNT0;
    flicker = now >> 1;
    let turn = now < lastTimer;
    if (turn) ++hiTimer;
    lastTimer = now;
    let analog = ADCH << 8 | ADCL; // uint16_t
    if (analog > battery - (battery >> 8)) {
      battery = analog;
      if (buttonHandled) {
        if (state != stateDecade && buttonTime < holdTime) {
          state = stateDecade;
        } else {
          switch (buttonHandled) {
            case nextButton:
              if (buttonTime >= holdTime) {
                state = state == stateMystery ? stateOverview : stateMystery;
              } else {
                stepPrayer(1);
              }
              break;
            case resetButton:
              if (buttonTime >= holdTime) {
                prayerIndex = 0;
              } else {
                if (prayerIndex < 5) {
                  prayerIndex = 0;
                } else {
                  prayerIndex -= (prayerIndex - 5) % 11;
                }
              }
              break;
            case nextResetButton:
              state = stateBattery;
              break;
            case prevButton:
              stepPrayer(prayerCount - 1);
              break;
          }
        }
        buttonHandled = 0;
        buttonTime = 0;
      }
    } else if (battery > 128) {
      let ratio = analog / (battery >> 7) | 0; // uint8_t
      console.log(ratio, analog, battery);
      if (ratio >= 82) {
        prepButton(nextButton, turn);
      } else if (ratio >= 64) {
        prepButton(resetButton, turn);
      } else if (ratio >= 43) {
        prepButton(nextResetButton, turn);
      } else {
        prepButton(prevButton, turn);
      }
    }
    if (buttonTime >= holdTime) {
      lightUp(11);
    } else {
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
            if (cycleIndex == 0) {
              ourFatherInDecade(((prayerIndex - 5) / 11 | 0) % 5);
            } else {
              hailMary(cycleIndex - 1);
            }
          }
          break;
        case stateMystery:
          if (prayerIndex < 5) {
            introductoryPrayer();
          } else {
            showDecade(((prayerIndex - 5) / 11 | 0) % 5);
          }
          break;
        case stateOverview:
          if (prayerIndex < 5) {
            introductoryPrayer();
          } else {
            showMystery((prayerIndex - 5) / 55 | 0);
          }
          break;
        case stateBattery:
          showBattery();
          break;
      }
    }
  }

  return {
    setup, loop, freq: 9.6e6 / 8, diagnostics: () => ({
      state, prayerIndex, battery, buttonHandled, buttonTime, cancelCountdown: cancelTime - buttonTime
    })
  };
})();
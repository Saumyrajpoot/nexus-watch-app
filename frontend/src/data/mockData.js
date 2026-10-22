export const initialSampleEvents = [
  {
    id: 'evt-101',
    title: 'Autonomous Drone Swarm Navigation Protocol',
    type: 'presentation',
    content: 'Reviewing the multi-agent mesh communication protocol for autonomous drones. Low-latency UDP broadcasting with fallback to localized RF signals. Key metrics show 99.4% packet delivery within 12ms. Next milestone: field testing in RF-denied subterranean tunnels.',
    transcript: 'Reviewing the multi-agent mesh communication protocol for autonomous drones. Low-latency UDP broadcasting with fallback to localized RF signals. Key metrics show 99.4% packet delivery within 12ms. Next milestone: field testing in RF-denied subterranean tunnels.',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    priority: 'high',
    tags: ['Robotics', 'Mesh Network', 'Firmware'],
    slides: [
      {
        title: "Autonomous Drone Swarm Architecture",
        bullets: [
          "Multi-agent mesh synchronization across localized clusters",
          "Ultra-low latency UDP broadcast protocol with 12ms target",
          "Decentralized peer-to-peer failover when hub loses telemetry"
        ]
      },
      {
        title: "Field Benchmark & Packet Delivery",
        bullets: [
          "99.4% packet reception achieved under heavy signal attenuation",
          "RF-denied subterranean obstacle clearance testing",
          "Dynamic channel frequency hopping to mitigate interference"
        ]
      },
      {
        title: "Next Milestones & Deployment Schedule",
        bullets: [
          "Subterranean tunnel clearance tests scheduled for Q4",
          "Firmware OTA optimization to conserve on-board battery",
          "Production deployment readiness review with team leads"
        ]
      }
    ]
  },
  {
    id: 'evt-102',
    title: 'Lead Architect Sync: Hardware Power Budget',
    type: 'meeting',
    time: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2 hours from now
    content: 'Discussing battery life optimization on the ESP32 wrist unit. We need to decrease I2S continuous sampling to burst mode when idle, potentially extending wrist wearable longevity to 36 hours on a 400mAh LiPo.',
    transcript: 'Discussing battery life optimization on the ESP32 wrist unit. We need to decrease I2S continuous sampling to burst mode when idle, potentially extending wrist wearable longevity to 36 hours on a 400mAh LiPo.',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    priority: 'critical',
    tags: ['ESP32', 'Power', 'Hardware'],
    callScheduled: true
  },
  {
    id: 'evt-103',
    title: 'Twilio Voice AI Dispatch Latency Audit',
    type: 'meeting',
    time: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), // 5 hours from now
    content: 'Follow up on the automated Polly.Matthew voice dispatch system. Confirm that phone calls trigger within 15 seconds of target schedule window.',
    transcript: 'Follow up on the automated Polly.Matthew voice dispatch system. Confirm that phone calls trigger within 15 seconds of target schedule window.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    priority: 'medium',
    tags: ['Twilio', 'Voice AI', 'Cron']
  },
  {
    id: 'evt-104',
    title: 'Quick Memo: MEMS Mic Solder Bridge Notice',
    type: 'task',
    content: 'Check pin 25 on the rev 2.1 prototype board. Ensure INMP441 L/R pin is tied to GND for clean Left channel audio extraction before flashing firmware.',
    transcript: 'Check pin 25 on the rev 2.1 prototype board. Ensure INMP441 L/R pin is tied to GND for clean Left channel audio extraction before flashing firmware.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    priority: 'normal',
    tags: ['Soldering', 'Microphone', 'Hardware']
  },
  {
    id: 'evt-105',
    title: 'Executive Brief: Groq Whisper-v3 Integration',
    type: 'presentation',
    content: 'Migration from standard cloud endpoints to Groq whisper-large-v3 reduced speech-to-text latency from 2400ms down to 310ms. Real-time feedback to the watch ST7735 screen is now virtually instantaneous.',
    transcript: 'Migration from standard cloud endpoints to Groq whisper-large-v3 reduced speech-to-text latency from 2400ms down to 310ms. Real-time feedback to the watch ST7735 screen is now virtually instantaneous.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    priority: 'high',
    tags: ['Groq', 'Whisper', 'Benchmarks'],
    slides: [
      {
        title: "Groq Whisper-v3 Latency Benchmarks",
        bullets: [
          "Latency slashed from 2.4s to ~310ms for 5-second voice bursts",
          "Zero hallucinatory drift using temperature 0.0 configuration",
          "Ultra-low TTFB allows immediate OLED/TFT feedback loop"
        ]
      },
      {
        title: "Wearable UX Transformation",
        bullets: [
          "Instant haptic / visual confirmation on wrist display",
          "Reduced user wait anxiety during Push-to-Talk sessions",
          "End-to-end processing pipeline now under 1.2s total"
        ]
      }
    ]
  }
];

// Initial Ship Definitions (MVP: Frigates)

export const SHIPS = {
  // Gallente Frigates
  incursus: {
    id: 'incursus',
    name: 'Incursus',
    faction: 'Gallente',
    class: 'Frigate',
    price: 60000,
    description: 'A heavy combat frigate favored by Gallente forces. Excels at close range with blasters and strong armor repair.',
    slots: {
      high: 3,
      mid: 3,
      low: 4
    },
    resources: {
      pg: 40,   // Powergrid (MW)
      cpu: 135, // CPU (tf)
      cap_capacity: 400, // GJ
      cap_recharge: 187  // Seconds to full
    },
    defense: {
      shield: { hp: 350, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 450, em: 50, th: 35, kin: 35, exp: 10 },
      hull: { hp: 500, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 42 // meters
    },
    mobility: {
      mass: 1100000,
      base_speed: 315, // m/s
      agility: 3.0 // seconds to reach ~63% of max velocity
    },
    drone_bandwidth: 5,
    drone_bay: 5
  },
  
  // Caldari Frigates
  kestrel: {
    id: 'kestrel',
    name: 'Kestrel',
    faction: 'Caldari',
    class: 'Frigate',
    price: 75000,
    description: 'A missile boat designed for standoff engagements. Relies on strong shields and consistent missile damage.',
    slots: {
      high: 4,
      mid: 4,
      low: 2
    },
    resources: {
      pg: 45,
      cpu: 160,
      cap_capacity: 315,
      cap_recharge: 150
    },
    defense: {
      shield: { hp: 500, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 300, em: 50, th: 35, kin: 25, exp: 10 },
      hull: { hp: 350, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 45
    },
    mobility: {
      mass: 1150000,
      base_speed: 305,
      agility: 3.5
    },
    drone_bandwidth: 0,
    drone_bay: 0
  },

  merlin: {
    id: 'merlin',
    name: 'Merlin',
    faction: 'Caldari',
    class: 'Frigate',
    price: 65000,
    description: 'A hybrid-turret platform built on Caldari shield doctrine. Carries the highest base shield HP of any frigate.',
    slots: {
      high: 3,
      mid: 4,
      low: 2
    },
    resources: {
      pg: 38,
      cpu: 155,
      cap_capacity: 350,
      cap_recharge: 165
    },
    defense: {
      shield: { hp: 520, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 220, em: 50, th: 35, kin: 25, exp: 10 },
      hull: { hp: 260, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 40
    },
    mobility: {
      mass: 1120000,
      base_speed: 320,
      agility: 3.2
    },
    drone_bandwidth: 0,
    drone_bay: 0
  },

  // Gallente Frigates
  atron: {
    id: 'atron',
    name: 'Atron',
    faction: 'Gallente',
    class: 'Frigate',
    price: 50000,
    description: 'The fastest hull in known space. Thin across all three defense layers — cheap, disposable, and hard to catch.',
    slots: {
      high: 3,
      mid: 3,
      low: 3
    },
    resources: {
      pg: 35,
      cpu: 120,
      cap_capacity: 300,
      cap_recharge: 170
    },
    defense: {
      shield: { hp: 280, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 280, em: 50, th: 35, kin: 25, exp: 10 },
      hull: { hp: 280, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 35
    },
    mobility: {
      mass: 1000000,
      base_speed: 400,
      agility: 2.2
    },
    drone_bandwidth: 0,
    drone_bay: 0
  },

  tristan: {
    id: 'tristan',
    name: 'Tristan',
    faction: 'Gallente',
    class: 'Frigate',
    price: 70000,
    description: 'A drone-bay frigate: one high slot for a turret or a neut, the rest of its firepower launched. Fights from a squadron, not a gun rack.',
    slots: {
      high: 1,
      mid: 3,
      low: 4
    },
    resources: {
      pg: 38,
      cpu: 145,
      cap_capacity: 380,
      cap_recharge: 175
    },
    defense: {
      shield: { hp: 380, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 420, em: 50, th: 35, kin: 35, exp: 10 },
      hull: { hp: 400, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 40
    },
    mobility: {
      mass: 1100000,
      base_speed: 325,
      agility: 3.0
    },
    drone_bandwidth: 25,
    drone_bay: 25
  },

  catalyst: {
    id: 'catalyst',
    name: 'Catalyst',
    faction: 'Gallente',
    class: 'Destroyer',
    price: 180000,
    requiredSkills: { destroyers: 1 },
    description: 'A destroyer-class turret platform: eight high slots of raw DPS traded for a large signature and sluggish agility. Fast small ships can out-orbit its tracking.',
    slots: {
      high: 8,
      mid: 2,
      low: 3
    },
    resources: {
      pg: 90,
      cpu: 220,
      cap_capacity: 450,
      cap_recharge: 200
    },
    defense: {
      shield: { hp: 400, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 450, em: 50, th: 35, kin: 35, exp: 10 },
      hull: { hp: 450, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 65
    },
    mobility: {
      mass: 2200000,
      base_speed: 250,
      agility: 4.5
    },
    drone_bandwidth: 0,
    drone_bay: 0
  },

  cormorant: {
    id: 'cormorant',
    name: 'Cormorant',
    faction: 'Caldari',
    class: 'Destroyer',
    price: 190000,
    requiredSkills: { destroyers: 1 },
    description: 'A railgun sniper platform: seven high slots behind Caldari shields, built to kill from beyond retaliation range. Slow to turn — anything that closes the gap can out-orbit its tracking.',
    slots: {
      high: 7,
      mid: 4,
      low: 2
    },
    resources: {
      pg: 85,
      cpu: 270,
      cap_capacity: 425,
      cap_recharge: 185
    },
    defense: {
      shield: { hp: 550, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 350, em: 50, th: 35, kin: 25, exp: 10 },
      hull: { hp: 400, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 62
    },
    mobility: {
      mass: 2300000,
      base_speed: 240,
      agility: 4.2
    },
    drone_bandwidth: 0,
    drone_bay: 0
  },

  algos: {
    id: 'algos',
    name: 'Algos',
    faction: 'Gallente',
    class: 'Destroyer',
    price: 185000,
    requiredSkills: { destroyers: 1, drones: 1 },
    description: 'A hybrid destroyer/drone platform: four turrets backed by a 40 m³ bay deep enough to carry backup drones for mid-fight relaunch.',
    slots: {
      high: 4,
      mid: 4,
      low: 4
    },
    resources: {
      pg: 70,
      cpu: 240,
      cap_capacity: 430,
      cap_recharge: 195
    },
    defense: {
      shield: { hp: 420, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 470, em: 50, th: 35, kin: 35, exp: 10 },
      hull: { hp: 430, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 63
    },
    mobility: {
      mass: 2250000,
      base_speed: 245,
      agility: 4.3
    },
    drone_bandwidth: 25,
    drone_bay: 40
  }
};

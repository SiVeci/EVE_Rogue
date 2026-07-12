// Initial Ship Definitions (MVP: Frigates)

export const SHIPS = {
  // Gallente Frigates
  incursus: {
    id: 'incursus',
    name: 'Incursus',
    faction: 'Gallente',
    class: 'Frigate',
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
  }
};

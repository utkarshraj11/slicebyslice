// Which real street stretches each neighborhood tile shows. `pnpm lots <hood>` fetches every lot on
// both sides of these stretches. NYC hoods read PLUTO (street names as PLUTO spells them);
// Hoboken isn't in PLUTO, so it reads OpenStreetMap building footprints instead.
export const AREAS = {
  village: {
    borough: 'MN',
    streets: {
      'BLEECKER STREET': [230, 340],
      'CHRISTOPHER STREET': [60, 130],
      'CARMINE STREET': [1, 30],
      'CORNELIA STREET': [1, 30],
      'JONES STREET': [1, 30],
      'MORTON STREET': [1, 20],
      'GROVE STREET': [1, 30],
      'AVENUE OF THE AMERICAS': [280, 345],
      '7 AVENUE SOUTH': [50, 115],
    },
  },
  midtown: {
    borough: 'MN',
    streets: {
      '8 AVENUE': [500, 1010],
      'WEST 57 STREET': [290, 330],
      'WEST 58 STREET': [290, 330],
      'WEST 38 STREET': [200, 270],
      'WEST 39 STREET': [200, 270],
      '7 AVENUE': [500, 560],
    },
  },
  fidi: {
    borough: 'MN',
    streets: {
      'WALL STREET': [1, 130],
      'BEAVER STREET': [1, 90],
      'PEARL STREET': [60, 130],
      'WATER STREET': [60, 130],
      'HANOVER STREET': [1, 30],
      'BROAD STREET': [1, 30],
      'WILLIAM STREET': [1, 40],
    },
  },
  dumbo: {
    borough: 'BK',
    streets: {
      'WATER STREET': [1, 70],
      'FRONT STREET': [1, 70],
      'OLD FULTON STREET': [1, 60],
      'DOCK STREET': [1, 40],
      'NEW DOCK STREET': [1, 40],
    },
  },
  midwood: {
    borough: 'BK',
    streets: {
      'AVENUE J': [1300, 1620],
      'EAST 15 STREET': [1100, 1340],
      'EAST 16 STREET': [1100, 1340],
      'EAST 14 STREET': [1100, 1340],
    },
  },
  hoboken: {
    osm: { bbox: [40.7345, -74.0410, 40.7495, -74.0250], bearing: 13 },
    streets: {
      'Washington Street': [1, 700],
      'Hudson Street': [1, 700],
      'Monroe Street': [600, 800],
      'Adams Street': [600, 800],
      '1st Street': [1, 200],
      'Newark Street': [1, 200],
      '6th Street': [1, 200],
      '7th Street': [1, 600],
      '8th Street': [1, 600],
    },
  },
};

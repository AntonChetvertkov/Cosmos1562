export const cosmodromes = [
    { name: "Baikonur Cosmodrome",        lat: 45.9646,  lon: 63.3052   },
    { name: "Kennedy Space Center",       lat: 28.5728,  lon: -80.6490  },
    { name: "Cape Canaveral SFS",         lat: 28.4889,  lon: -80.5778  },
    { name: "Vandenberg SFB",             lat: 34.7420,  lon: -120.5724 },
    { name: "Starbase (SpaceX)",          lat: 25.9969,  lon: -97.1571  },
    { name: "Wallops Flight Facility",    lat: 37.8402,  lon: -75.4778  },
    { name: "Plesetsk Cosmodrome",        lat: 62.9271,  lon: 40.5777   },
    { name: "Vostochny Cosmodrome",       lat: 51.8746,  lon: 128.3551  },
    { name: "Kapustin Yar",               lat: 48.5735,  lon: 46.2558   },
    { name: "Kourou / CSG",               lat: 5.2390,   lon: -52.7685  },
    { name: "Satish Dhawan (ISRO)",       lat: 13.7199,  lon: 80.2304   },
    { name: "Jiuquan (CNSA)",             lat: 40.9608,  lon: 100.2983  },
    { name: "Xichang (CNSA)",             lat: 28.2460,  lon: 102.0270  },
    { name: "Wenchang (CNSA)",            lat: 19.6145,  lon: 110.9513  },
    { name: "Taiyuan (CNSA)",             lat: 38.8490,  lon: 111.6083  },
    { name: "Tanegashima (JAXA)",         lat: 30.4012,  lon: 130.9685  },
    { name: "Uchinoura (JAXA)",           lat: 31.2514,  lon: 131.0814  },
    { name: "Naro (KARI)",                lat: 34.4322,  lon: 127.5350  },
    { name: "Mahia Peninsula (RocketLab)", lat: -39.2596, lon: 177.8644 },
    { name: "Imam Khomeini (Iran)",       lat: 35.2344,  lon: 53.9211   },
    { name: "Shahroud (Iran)",            lat: 36.2070,  lon: 55.4670   },
    { name: "Alcantara (Brazil)",         lat: -2.3729,  lon: -44.3964  },
    { name: "Palmachim (Israel)",         lat: 31.8964,  lon: 34.6903   },
    { name: "Sutherland (UK)",            lat: 58.5200,  lon: -4.4200   },
];

export const capitals = [
    { name: "Astana",         lat: 51.1801,  lon: 71.4460  },
    { name: "Washington D.C", lat: 38.8951,  lon: -77.0369 },
    { name: "Moscow",         lat: 55.7558,  lon: 37.6173  },
    { name: "Paris",          lat: 48.8566,  lon: 2.3522   },
    { name: "New Delhi",      lat: 28.6139,  lon: 77.2090  },
    { name: "Beijing",        lat: 39.9042,  lon: 116.4074 },
    { name: "Tokyo",          lat: 35.6762,  lon: 139.6503 },
    { name: "Seoul",          lat: 37.5665,  lon: 126.9780 },
    { name: "Wellington",     lat: -41.2866, lon: 174.7756 },
    { name: "Tehran",         lat: 35.6892,  lon: 51.3890  },
    { name: "Brasilia",       lat: -15.7975, lon: -47.8919 },
    { name: "Jerusalem",      lat: 31.7683,  lon: 35.2137  },
    { name: "London",         lat: 51.5074,  lon: -0.1278  },
];

export function getSatColour(name) {
    if (name.includes('GPS'))       return 'blue';
    if (name.includes('COSMOS'))    return 'red';
    if (name.includes('LUCH'))      return 'red';
    if (name.includes('BEIDOU'))    return 'yellow';
    if (name.includes('GALILEO'))   return 'cyan';
    if (name.includes('NAVIC'))     return 'orange';
    if (name.includes('IRNSS'))     return 'orange';
    if (name.includes('QZSS'))      return 'purple';
    if (name.includes('AEROCUBE'))  return 'blue';
    if (name.includes('RAVAN'))     return 'blue';
    if (name.includes('SNAP'))      return 'blue';
    if (name.includes('PROPCUBE'))  return 'blue';
    if (name.includes('CORVUS'))    return 'blue';
    if (name.includes('MAKERSAT'))  return 'blue';
    if (name.includes('SIRION'))    return 'blue';
    if (name.includes('FOX'))       return 'blue';
    if (name.includes('PERSEUS'))   return 'red';
    if (name.includes('POLYITAN'))  return 'red';
    if (name.includes('SITRO'))     return 'red';
    if (name.includes('QB50'))      return 'cyan';
    if (name.includes('GOMX'))      return 'cyan';
    if (name.includes('TRITON'))    return 'cyan';
    if (name.includes('STRAND'))    return 'cyan';
    if (name.includes('UWE'))       return 'cyan';
    if (name.includes('BEESAT'))    return 'cyan';
    if (name.includes('FUNCUBE'))   return 'cyan';
    if (name.includes('UKUBE'))     return 'cyan';
    if (name.includes('NETSAT'))    return 'cyan';
    if (name.includes('DELFI'))     return 'cyan';
    if (name.includes('SWISSCUBE')) return 'cyan';
    if (name.includes('TISAT'))     return 'cyan';
    if (name.includes('BRITE'))     return 'cyan';
    if (name.includes('CANX'))      return 'cyan';
    if (name.includes('SEEDS'))     return 'purple';
    if (name.includes('WNISAT'))    return 'purple';
    if (name.includes('CUTE'))      return 'purple';
    if (name.includes('CUBESAT XI'))return 'purple';
    if (name.includes('POPACS'))    return 'purple';
    if (name.includes('HORYU'))     return 'purple';
    if (name.includes('OPTICUBE'))  return 'purple';
    if (name.includes('NANOSAT'))   return 'green';
    if (name.includes('ZACUBE'))    return 'green';
    if (name.includes('CUBEBUG'))   return 'green';
    if (name.includes('PEGASO'))    return 'green';
    if (name.includes('KRYSAOR'))   return 'green';
    if (name.includes('GREENCUBE')) return 'green';
    if (name.includes('STARLINK')) return '#66ff66';
    return '#ffffff';
}

export function getSatOperator(name) {
    if (name.includes('GPS'))       return 'USA';
    if (name.includes('COSMOS'))    return 'Russia';
    if (name.includes('LUCH'))      return 'Russia';    
    if (name.includes('BEIDOU'))    return 'China';
    if (name.includes('CSS'))       return 'China';
    if (name.includes('GALILEO'))   return 'Europe';
    if (name.includes('NAVIC'))     return 'India';
    if (name.includes('IRNSS'))     return 'India';
    if (name.includes('QZSS'))      return 'Japan';
    if (name.includes('ISS'))       return 'International';
    if (name.includes('AEROCUBE'))  return 'USA';
    if (name.includes('RAVAN'))     return 'USA';
    if (name.includes('SNAP'))      return 'USA';
    if (name.includes('PROPCUBE'))  return 'USA';
    if (name.includes('CORVUS'))    return 'USA';
    if (name.includes('MAKERSAT'))  return 'USA';
    if (name.includes('SIRION'))    return 'USA';
    if (name.includes('FOX'))       return 'USA';
    if (name.includes('STARLINK')) return 'USA - SpaceX';
    if (name.includes('PERSEUS'))   return 'Russia';
    if (name.includes('SITRO'))     return 'Russia';
    if (name.includes('POLYITAN'))  return 'Europe';
    if (name.includes('QB50'))      return 'Europe';
    if (name.includes('GOMX'))      return 'Europe';
    if (name.includes('TRITON'))    return 'Europe';
    if (name.includes('UWE'))       return 'Europe';
    if (name.includes('BEESAT'))    return 'Europe';
    if (name.includes('NETSAT'))    return 'Europe';
    if (name.includes('DELFI'))     return 'Europe';
    if (name.includes('SWISSCUBE')) return 'Europe';
    if (name.includes('TISAT'))     return 'Europe';
    if (name.includes('BRITE'))     return 'Europe';
    if (name.includes('CANX'))      return 'Europe';
    if (name.includes('GREENCUBE')) return 'Europe';
    if (name.includes('STRAND'))    return 'UK';
    if (name.includes('UKUBE'))     return 'UK';
    if (name.includes('FUNCUBE'))   return 'UK';
    if (name.includes('SEEDS'))     return 'Japan';
    if (name.includes('WNISAT'))    return 'Japan';
    if (name.includes('CUTE'))      return 'Japan';
    if (name.includes('CUBESAT XI'))return 'Japan';
    if (name.includes('POPACS'))    return 'Japan';
    if (name.includes('HORYU'))     return 'Japan';
    if (name.includes('OPTICUBE'))  return 'Japan';
    if (name.includes('NANOSAT'))   return 'Unknown';
    if (name.includes('ZACUBE'))    return 'Unknown';
    if (name.includes('DUCHIFAT'))  return 'Unknown';
    if (name.includes('CUBEBUG'))   return 'Unknown';
    if (name.includes('PEGASO'))    return 'Unknown';
    if (name.includes('KRYSAOR'))   return 'Unknown';
    return 'Unknown';
}
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
    if (name.includes('NANOSAT'))   return 'cyan';
    if (name.includes('KRYSAOR'))   return 'red';
    if (name.includes('GREENCUBE')) return 'cyan';
    if (name.includes('STARLINK')) return '#66ff66';
    if (name.includes('DMSP'))       return 'blue';
    if (name.includes('NOAA'))       return 'blue';
    if (name.includes('JPSS'))       return 'blue';
    if (name.includes('GOES'))       return 'blue';
    if (name.includes('SUOMI'))      return 'blue';
    if (name.includes('CYGFM'))      return 'blue';
    if (name.includes('FENGYUN'))    return 'yellow';
    if (name.includes('TIANMU'))     return 'yellow';
    if (name.includes('METEOSAT'))   return 'cyan';
    if (name.includes('METOP'))      return 'cyan';
    if (name.includes('METEOR'))     return 'red';
    if (name.includes('ELEKTRO'))    return 'red';
    if (name.includes('ARKTIKA'))    return 'red';
    if (name.includes('INSAT'))      return 'orange';
    if (name.includes('HIMAWARI'))   return 'purple';
    if (name.includes('COMS'))       return 'green';
    if (name.includes('GEO-KOMPSAT'))return 'green';
    if (name.includes('RESURS'))     return 'red';
    if (name.includes('KANOPUS'))    return 'red';
    if (name.includes('KONDOR'))     return 'red';
    if (name.includes('RESURS-DK'))  return 'red';
    if (name.includes('IONOSFERA')) return 'red';
    if (name.includes('GAOFEN'))     return 'yellow';
    if (name.includes('YAOGAN'))     return 'yellow';
    if (name.includes('ZIYUAN'))     return 'yellow';
    if (name.includes('HAIYANG'))    return 'yellow';
    if (name.includes('HUANJING'))   return 'yellow';
    if (name.includes('SHIYAN'))     return 'yellow';
    if (name.includes('CARTOSAT'))   return 'orange';
    if (name.includes('IRS-'))       return 'orange';
    if (name.includes('RESOURCESAT'))return 'orange';
    if (name.includes('OCEANSAT'))   return 'orange';
    if (name.includes('SARAL'))      return 'orange';
    if (name.includes('ALOS'))       return 'purple';
    if (name.includes('GOSAT'))      return 'purple';
    if (name.includes('ASNARO'))     return 'purple';
    if (name.includes('HODOYOSHI'))  return 'purple';
    if (name.includes('SENTINEL'))   return 'cyan';
    if (name.includes('SPOT'))       return 'cyan';
    if (name.includes('PLEIADES'))   return 'cyan';
    if (name.includes('SMOS'))       return 'cyan';
    if (name.includes('METOP'))      return 'cyan';
    if (name.includes('SCO'))      return 'cyan';
    if (name.includes('COSMO-SKYMED')) return 'cyan';
    if (name.includes('TERRASAR'))   return 'cyan';
    if (name.includes('TANDEM-X'))   return 'cyan';
    if (name.includes('DLR-TUBSAT')) return 'cyan';
    if (name.includes('LANDSAT'))    return 'blue';
    if (name.includes('WORLDVIEW'))  return 'blue';
    if (name.includes('GEOEYE'))     return 'blue';
    if (name.includes('SKYSAT'))     return 'blue';
    if (name.includes('AQUA'))       return 'blue';
    if (name.includes('TERRA'))      return 'blue';
    if (name.includes('AURA'))       return 'blue';
    if (name.includes('GPM'))        return 'blue';
    if (name.includes('ARIRANG'))    return 'green';
    if (name.includes('KOMPSAT'))    return 'green';
    if (name.includes('MICROCARB'))  return 'cyan';
    if (name.includes('BIOMASS'))    return 'cyan';
    if (name.includes('LEGION'))     return 'blue';
    if (name.includes('CAS500'))     return 'green';
    if (name.includes('CSG-'))       return 'cyan';
    if (name.includes('JASON'))      return 'blue';
    if (name.includes('SINDO'))      return 'blue';
    if (name.includes('PATHFINDER'))      return 'blue';
    if (name.includes('GRBBETA'))      return 'cyan';
    if (name.includes('SINOD'))      return 'blue';
    if (name.includes('RADARSAT'))      return 'blue';
    if (name.includes('EXACTVIEW'))      return 'blue';
    if (name.includes('DEIMOS'))      return 'cyan';
    if (name.includes('LMRST'))      return 'blue';
    if (name.includes('CARBONITE'))      return 'cyan';
    if (name.includes('ICESAT'))      return 'blue';
    if (name.includes('FORESAIL'))      return 'cyan';
    if (name.includes('SMAP'))      return 'blue';
    if (name.includes('PRSC'))      return 'yellow';
    if (name.includes('SWOT'))      return 'blue';
    if (name.includes('SCATSAT'))      return 'orange';
    if (name.includes('CO3D'))      return 'cyan';
    if (name.includes('SRMSAT'))      return 'orange';
    if (name.includes('HYSIS'))      return 'orange';
    if (name.includes('KAZEOSAT'))      return 'red';
    if (name.includes('LASARSAT'))      return 'cyan';
    if (name.includes('CBERS'))      return 'yellow'; 
    if (name.includes('FORMOSAT'))      return 'yellow';
    return '#ffffff';
}


export function getSatOperator(name) {
    if (name.includes('GPS'))       return 'USA';
    if (name.includes('COSMOS'))    return 'Russia';
    if (name.includes('LUCH'))      return 'Russia';    
    if (name.includes('BEIDOU'))    return 'China';
    if (name.includes('CSS'))       return 'China';
    if (name.includes('GALILEO'))   return 'EU';
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
    if (name.includes('POLYITAN'))  return 'EU';
    if (name.includes('QB50'))      return 'EU';
    if (name.includes('GOMX'))      return 'EU';
    if (name.includes('TRITON'))    return 'EU';
    if (name.includes('UWE'))       return 'EU';
    if (name.includes('BEESAT'))    return 'EU';
    if (name.includes('NETSAT'))    return 'EU';
    if (name.includes('DELFI'))     return 'EU';
    if (name.includes('SWISSCUBE')) return 'EU';
    if (name.includes('TISAT'))     return 'EU';
    if (name.includes('BRITE'))     return 'EU';
    if (name.includes('CANX'))      return 'EU';
    if (name.includes('GREENCUBE')) return 'EU';
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
    if (name.includes('DMSP'))       return 'USA';
    if (name.includes('NOAA'))       return 'USA';
    if (name.includes('JPSS'))       return 'USA';
    if (name.includes('GOES'))       return 'USA';
    if (name.includes('SUOMI'))      return 'USA';
    if (name.includes('CYGFM'))      return 'USA';
    if (name.includes('FENGYUN'))    return 'China';
    if (name.includes('TIANMU'))     return 'China';
    if (name.includes('METEOSAT'))   return 'EU';
    if (name.includes('METOP'))      return 'EU';
    if (name.includes('METEOR'))     return 'Russia';
    if (name.includes('ELEKTRO'))    return 'Russia';
    if (name.includes('ARKTIKA'))    return 'Russia';
    if (name.includes('IONOSFERA')) return 'Russia';
    if (name.includes('INSAT'))      return 'India';
    if (name.includes('HIMAWARI'))   return 'Japan';
    if (name.includes('COMS'))       return 'South Korea';
    if (name.includes('GEO-KOMPSAT'))return 'South Korea';
    if (name.includes('SINDO'))      return 'blue';
    if (name.includes('MICROCARB'))  return 'EU';
    if (name.includes('BIOMASS'))    return 'EU';
    if (name.includes('KENT'))       return 'Singapore';
    if (name.includes('SINAH'))      return 'Iran';
    if (name.includes('PRSC'))       return 'Unknown';
    if (name.includes('SCD'))        return 'Brazil';
    if (name.includes('TECHSAT'))    return 'Israel';
    if (name.includes('LEGION'))     return 'USA';
    if (name.includes('CAS500'))     return 'South Korea';
    if (name.includes('CSG-'))       return 'EU';
    if (name.includes('JASON'))      return 'USA';
    if (name.includes('DUBAI'))      return 'UAE';
    if (name.includes('RADARSAT'))      return 'Canada';
    if (name.includes('PATHFINDER'))      return 'USA';
    if (name.includes('SCO'))      return 'EU';
    if (name.includes('GRBBETA'))      return 'EU';
    if (name.includes('SINOD'))      return 'USA';
    if (name.includes('SAUDI'))      return 'Saudi Arabia';
    if (name.includes('EXACTVIEW'))      return 'Canada';
    if (name.includes('RASAT'))      return 'Turkiye';
    if (name.includes('DEIMOS'))      return 'EU';
    if (name.includes('LMRST'))      return 'USA';
    if (name.includes('CARBONITE'))      return 'UK';
    if (name.includes('ICESAT'))      return 'USA';
    if (name.includes('FORESAIL'))      return 'EU';
    if (name.includes('SMAP'))      return 'USA';
    if (name.includes('PRSC'))      return 'China';
    if (name.includes('SWOT'))      return 'USA';
    if (name.includes('SCATSAT'))      return 'India';
    if (name.includes('CO3D 3'))      return 'EU';
    if (name.includes('GOKTURK'))      return 'Turkiye';
    if (name.includes('SRMSAT'))      return 'India';
    if (name.includes('KNACKSAT'))      return 'Thailand';
    if (name.includes('HYSIS'))      return 'India';
    if (name.includes('LASARSAT'))      return 'EU';
    if (name.includes('KAZEOSAT'))      return 'Kazakhstan';   
    if (name.includes('ITUPSAT'))      return 'Turkiye'; 
    if (name.includes('DUCHIFAT'))      return 'Israel';
    if (name.includes('CBERS'))      return 'China';
    if (name.includes('THEOS'))      return 'Thailand';
    if (name.includes('FORMOSAT'))      return 'China';
    return 'Unknown';
}
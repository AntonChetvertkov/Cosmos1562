var pi = Math.PI;
var twoPi = pi * 2;
var deg2rad = pi / 180.0;
var rad2deg = 180 / pi;
var minutesPerDay = 1440.0;
var mu = 398600.8;
var earthRadius = 6378.135;
var xke = 60.0 / Math.sqrt(earthRadius * earthRadius * earthRadius / mu);
var vkmpersec = earthRadius * xke / 60.0;
var tumin = 1.0 / xke;
var j2 = 0.001082616;
var j3 = -0.00000253881;
var j4 = -0.00000165597;
var j3oj2 = j3 / j2;
var x2o3 = 2.0 / 3.0;
var xpdotp = 1440.0 / (2.0 * pi);

var constants = Object.freeze({
    __proto__: null,
    deg2rad: deg2rad,
    earthRadius: earthRadius,
    j2: j2,
    j3: j3,
    j3oj2: j3oj2,
    j4: j4,
    minutesPerDay: minutesPerDay,
    mu: mu,
    pi: pi,
    rad2deg: rad2deg,
    tumin: tumin,
    twoPi: twoPi,
    vkmpersec: vkmpersec,
    x2o3: x2o3,
    xke: xke,
    xpdotp: xpdotp
});

function days2mdhms(year, days) {
  var lmonth = [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var dayofyr = Math.floor(days);
  var i = 1;
  var inttemp = 0;
  while (dayofyr > inttemp + lmonth[i - 1] && i < 12) {
    inttemp += lmonth[i - 1];
    i += 1;
  }
  var mon = i;
  var day = dayofyr - inttemp;
  var temp = (days - dayofyr) * 24.0;
  var hr = Math.floor(temp);
  temp = (temp - hr) * 60.0;
  var minute = Math.floor(temp);
  var sec = (temp - minute) * 60.0;
  return {
    mon: mon,
    day: day,
    hr: hr,
    minute: minute,
    sec: sec
  };
}
function jdayInternal(year, mon, day, hr, minute, sec) {
  var msec = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;
  return 367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor(275 * mon / 9.0) + day + 1721013.5 + ((msec / 60000 + sec / 60.0 + minute) / 60.0 + hr) / 24.0
  ;
}
function jday(yearOrDate, mon, day, hr, minute, sec) {
  var msec = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;
  if (yearOrDate instanceof Date) {
    var date = yearOrDate;
    return jdayInternal(date.getUTCFullYear(), date.getUTCMonth() + 1,
    date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
  }
  return jdayInternal(yearOrDate, mon, day, hr, minute, sec, msec);
}
function invjday(jd, asArray) {
  var temp = jd - 2415019.5;
  var tu = temp / 365.25;
  var year = 1900 + Math.floor(tu);
  var leapyrs = Math.floor((year - 1901) * 0.25);
  var days = temp - ((year - 1900) * 365.0 + leapyrs) + 0.00000000001;
  if (days < 1.0) {
    year -= 1;
    leapyrs = Math.floor((year - 1901) * 0.25);
    days = temp - ((year - 1900) * 365.0 + leapyrs);
  }
  var mdhms = days2mdhms(year, days);
  var mon = mdhms.mon,
    day = mdhms.day,
    hr = mdhms.hr,
    minute = mdhms.minute;
  var sec = mdhms.sec - 0.00000086400;
  if (asArray) {
    return [year, mon, day, hr, minute, Math.floor(sec)];
  }
  return new Date(Date.UTC(year, mon - 1, day, hr, minute, Math.floor(sec)));
}
function dpper(satrec, options) {
  var e3 = satrec.e3,
    ee2 = satrec.ee2,
    peo = satrec.peo,
    pgho = satrec.pgho,
    pho = satrec.pho,
    pinco = satrec.pinco,
    plo = satrec.plo,
    se2 = satrec.se2,
    se3 = satrec.se3,
    sgh2 = satrec.sgh2,
    sgh3 = satrec.sgh3,
    sgh4 = satrec.sgh4,
    sh2 = satrec.sh2,
    sh3 = satrec.sh3,
    si2 = satrec.si2,
    si3 = satrec.si3,
    sl2 = satrec.sl2,
    sl3 = satrec.sl3,
    sl4 = satrec.sl4,
    t = satrec.t,
    xgh2 = satrec.xgh2,
    xgh3 = satrec.xgh3,
    xgh4 = satrec.xgh4,
    xh2 = satrec.xh2,
    xh3 = satrec.xh3,
    xi2 = satrec.xi2,
    xi3 = satrec.xi3,
    xl2 = satrec.xl2,
    xl3 = satrec.xl3,
    xl4 = satrec.xl4,
    zmol = satrec.zmol,
    zmos = satrec.zmos;
  var init = options.init,
    opsmode = options.opsmode;
  var ep = options.ep,
    inclp = options.inclp,
    nodep = options.nodep,
    argpp = options.argpp,
    mp = options.mp;
  var alfdp;
  var betdp;
  var cosip;
  var sinip;
  var cosop;
  var sinop;
  var dalf;
  var dbet;
  var dls;
  var f2;
  var f3;
  var pe;
  var pgh;
  var ph;
  var pinc;
  var pl;
  var sinzf;
  var xls;
  var xnoh;
  var zf;
  var zm;
  var zns = 1.19459e-5;
  var zes = 0.01675;
  var znl = 1.5835218e-4;
  var zel = 0.05490;
  zm = zmos + zns * t;
  if (init === 'y') {
    zm = zmos;
  }
  zf = zm + 2.0 * zes * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  var ses = se2 * f2 + se3 * f3;
  var sis = si2 * f2 + si3 * f3;
  var sls = sl2 * f2 + sl3 * f3 + sl4 * sinzf;
  var sghs = sgh2 * f2 + sgh3 * f3 + sgh4 * sinzf;
  var shs = sh2 * f2 + sh3 * f3;
  zm = zmol + znl * t;
  if (init === 'y') {
    zm = zmol;
  }
  zf = zm + 2.0 * zel * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  var sel = ee2 * f2 + e3 * f3;
  var sil = xi2 * f2 + xi3 * f3;
  var sll = xl2 * f2 + xl3 * f3 + xl4 * sinzf;
  var sghl = xgh2 * f2 + xgh3 * f3 + xgh4 * sinzf;
  var shll = xh2 * f2 + xh3 * f3;
  pe = ses + sel;
  pinc = sis + sil;
  pl = sls + sll;
  pgh = sghs + sghl;
  ph = shs + shll;
  if (init === 'n') {
    pe -= peo;
    pinc -= pinco;
    pl -= plo;
    pgh -= pgho;
    ph -= pho;
    inclp += pinc;
    ep += pe;
    sinip = Math.sin(inclp);
    cosip = Math.cos(inclp);
    if (inclp >= 0.2) {
      ph /= sinip;
      pgh -= cosip * ph;
      argpp += pgh;
      nodep += ph;
      mp += pl;
    } else {
      sinop = Math.sin(nodep);
      cosop = Math.cos(nodep);
      alfdp = sinip * sinop;
      betdp = sinip * cosop;
      dalf = ph * cosop + pinc * cosip * sinop;
      dbet = -ph * sinop + pinc * cosip * cosop;
      alfdp += dalf;
      betdp += dbet;
      nodep %= twoPi;
      if (nodep < 0.0 && opsmode === 'a') {
        nodep += twoPi;
      }
      xls = mp + argpp + cosip * nodep;
      dls = pl + pgh - pinc * nodep * sinip;
      xls += dls;
      xnoh = nodep;
      nodep = Math.atan2(alfdp, betdp);
      if (nodep < 0.0 && opsmode === 'a') {
        nodep += twoPi;
      }
      if (Math.abs(xnoh - nodep) > pi) {
        if (nodep < xnoh) {
          nodep += twoPi;
        } else {
          nodep -= twoPi;
        }
      }
      mp += pl;
      argpp = xls - mp - cosip * nodep;
    }
  }
  return {
    ep: ep,
    inclp: inclp,
    nodep: nodep,
    argpp: argpp,
    mp: mp
  };
}

function dscom(options) {
  var epoch = options.epoch,
    ep = options.ep,
    argpp = options.argpp,
    tc = options.tc,
    inclp = options.inclp,
    nodep = options.nodep,
    np = options.np;
  var a1;
  var a2;
  var a3;
  var a4;
  var a5;
  var a6;
  var a7;
  var a8;
  var a9;
  var a10;
  var cc;
  var x1;
  var x2;
  var x3;
  var x4;
  var x5;
  var x6;
  var x7;
  var x8;
  var zcosg;
  var zsing;
  var zcosh;
  var zsinh;
  var zcosi;
  var zsini;
  var ss1;
  var ss2;
  var ss3;
  var ss4;
  var ss5;
  var ss6;
  var ss7;
  var sz1;
  var sz2;
  var sz3;
  var sz11;
  var sz12;
  var sz13;
  var sz21;
  var sz22;
  var sz23;
  var sz31;
  var sz32;
  var sz33;
  var s1;
  var s2;
  var s3;
  var s4;
  var s5;
  var s6;
  var s7;
  var z1;
  var z2;
  var z3;
  var z11;
  var z12;
  var z13;
  var z21;
  var z22;
  var z23;
  var z31;
  var z32;
  var z33;
  var zes = 0.01675;
  var zel = 0.05490;
  var c1ss = 2.9864797e-6;
  var c1l = 4.7968065e-7;
  var zsinis = 0.39785416;
  var zcosis = 0.91744867;
  var zcosgs = 0.1945905;
  var zsings = -0.98088458;
  var nm = np;
  var em = ep;
  var snodm = Math.sin(nodep);
  var cnodm = Math.cos(nodep);
  var sinomm = Math.sin(argpp);
  var cosomm = Math.cos(argpp);
  var sinim = Math.sin(inclp);
  var cosim = Math.cos(inclp);
  var emsq = em * em;
  var betasq = 1.0 - emsq;
  var rtemsq = Math.sqrt(betasq);
  var peo = 0.0;
  var pinco = 0.0;
  var plo = 0.0;
  var pgho = 0.0;
  var pho = 0.0;
  var day = epoch + 18261.5 + tc / 1440.0;
  var xnodce = (4.5236020 - 9.2422029e-4 * day) % twoPi;
  var stem = Math.sin(xnodce);
  var ctem = Math.cos(xnodce);
  var zcosil = 0.91375164 - 0.03568096 * ctem;
  var zsinil = Math.sqrt(1.0 - zcosil * zcosil);
  var zsinhl = 0.089683511 * stem / zsinil;
  var zcoshl = Math.sqrt(1.0 - zsinhl * zsinhl);
  var gam = 5.8351514 + 0.0019443680 * day;
  var zx = 0.39785416 * stem / zsinil;
  var zy = zcoshl * ctem + 0.91744867 * zsinhl * stem;
  zx = Math.atan2(zx, zy);
  zx += gam - xnodce;
  var zcosgl = Math.cos(zx);
  var zsingl = Math.sin(zx);
  zcosg = zcosgs;
  zsing = zsings;
  zcosi = zcosis;
  zsini = zsinis;
  zcosh = cnodm;
  zsinh = snodm;
  cc = c1ss;
  var xnoi = 1.0 / nm;
  var lsflg = 0;
  while (lsflg < 2) {
    lsflg += 1;
    a1 = zcosg * zcosh + zsing * zcosi * zsinh;
    a3 = -zsing * zcosh + zcosg * zcosi * zsinh;
    a7 = -zcosg * zsinh + zsing * zcosi * zcosh;
    a8 = zsing * zsini;
    a9 = zsing * zsinh + zcosg * zcosi * zcosh;
    a10 = zcosg * zsini;
    a2 = cosim * a7 + sinim * a8;
    a4 = cosim * a9 + sinim * a10;
    a5 = -sinim * a7 + cosim * a8;
    a6 = -sinim * a9 + cosim * a10;
    x1 = a1 * cosomm + a2 * sinomm;
    x2 = a3 * cosomm + a4 * sinomm;
    x3 = -a1 * sinomm + a2 * cosomm;
    x4 = -a3 * sinomm + a4 * cosomm;
    x5 = a5 * sinomm;
    x6 = a6 * sinomm;
    x7 = a5 * cosomm;
    x8 = a6 * cosomm;
    z31 = 12.0 * x1 * x1 - 3.0 * x3 * x3;
    z32 = 24.0 * x1 * x2 - 6.0 * x3 * x4;
    z33 = 12.0 * x2 * x2 - 3.0 * x4 * x4;
    z1 = 3.0 * (a1 * a1 + a2 * a2) + z31 * emsq;
    z2 = 6.0 * (a1 * a3 + a2 * a4) + z32 * emsq;
    z3 = 3.0 * (a3 * a3 + a4 * a4) + z33 * emsq;
    z11 = -6.0 * a1 * a5 + emsq * (-24.0 * x1 * x7 - 6.0 * x3 * x5);
    z12 = -6.0 * (a1 * a6 + a3 * a5) + emsq * (-24.0 * (x2 * x7 + x1 * x8) + -6.0 * (x3 * x6 + x4 * x5));
    z13 = -6.0 * a3 * a6 + emsq * (-24.0 * x2 * x8 - 6.0 * x4 * x6);
    z21 = 6.0 * a2 * a5 + emsq * (24.0 * x1 * x5 - 6.0 * x3 * x7);
    z22 = 6.0 * (a4 * a5 + a2 * a6) + emsq * (24.0 * (x2 * x5 + x1 * x6) - 6.0 * (x4 * x7 + x3 * x8));
    z23 = 6.0 * a4 * a6 + emsq * (24.0 * x2 * x6 - 6.0 * x4 * x8);
    z1 = z1 + z1 + betasq * z31;
    z2 = z2 + z2 + betasq * z32;
    z3 = z3 + z3 + betasq * z33;
    s3 = cc * xnoi;
    s2 = -0.5 * s3 / rtemsq;
    s4 = s3 * rtemsq;
    s1 = -15.0 * em * s4;
    s5 = x1 * x3 + x2 * x4;
    s6 = x2 * x3 + x1 * x4;
    s7 = x2 * x4 - x1 * x3;
    if (lsflg === 1) {
      ss1 = s1;
      ss2 = s2;
      ss3 = s3;
      ss4 = s4;
      ss5 = s5;
      ss6 = s6;
      ss7 = s7;
      sz1 = z1;
      sz2 = z2;
      sz3 = z3;
      sz11 = z11;
      sz12 = z12;
      sz13 = z13;
      sz21 = z21;
      sz22 = z22;
      sz23 = z23;
      sz31 = z31;
      sz32 = z32;
      sz33 = z33;
      zcosg = zcosgl;
      zsing = zsingl;
      zcosi = zcosil;
      zsini = zsinil;
      zcosh = zcoshl * cnodm + zsinhl * snodm;
      zsinh = snodm * zcoshl - cnodm * zsinhl;
      cc = c1l;
    }
  }
  var zmol = (4.7199672 + (0.22997150 * day - gam)) % twoPi;
  var zmos = (6.2565837 + 0.017201977 * day) % twoPi;
  var se2 = 2.0 * ss1 * ss6;
  var se3 = 2.0 * ss1 * ss7;
  var si2 = 2.0 * ss2 * sz12;
  var si3 = 2.0 * ss2 * (sz13 - sz11);
  var sl2 = -2.0 * ss3 * sz2;
  var sl3 = -2.0 * ss3 * (sz3 - sz1);
  var sl4 = -2.0 * ss3 * (-21.0 - 9.0 * emsq) * zes;
  var sgh2 = 2.0 * ss4 * sz32;
  var sgh3 = 2.0 * ss4 * (sz33 - sz31);
  var sgh4 = -18.0 * ss4 * zes;
  var sh2 = -2.0 * ss2 * sz22;
  var sh3 = -2.0 * ss2 * (sz23 - sz21);
  var ee2 = 2.0 * s1 * s6;
  var e3 = 2.0 * s1 * s7;
  var xi2 = 2.0 * s2 * z12;
  var xi3 = 2.0 * s2 * (z13 - z11);
  var xl2 = -2.0 * s3 * z2;
  var xl3 = -2.0 * s3 * (z3 - z1);
  var xl4 = -2.0 * s3 * (-21.0 - 9.0 * emsq) * zel;
  var xgh2 = 2.0 * s4 * z32;
  var xgh3 = 2.0 * s4 * (z33 - z31);
  var xgh4 = -18.0 * s4 * zel;
  var xh2 = -2.0 * s2 * z22;
  var xh3 = -2.0 * s2 * (z23 - z21);
  return {
    snodm: snodm,
    cnodm: cnodm,
    sinim: sinim,
    cosim: cosim,
    sinomm: sinomm,
    cosomm: cosomm,
    day: day,
    e3: e3,
    ee2: ee2,
    em: em,
    emsq: emsq,
    gam: gam,
    peo: peo,
    pgho: pgho,
    pho: pho,
    pinco: pinco,
    plo: plo,
    rtemsq: rtemsq,
    se2: se2,
    se3: se3,
    sgh2: sgh2,
    sgh3: sgh3,
    sgh4: sgh4,
    sh2: sh2,
    sh3: sh3,
    si2: si2,
    si3: si3,
    sl2: sl2,
    sl3: sl3,
    sl4: sl4,
    s1: s1,
    s2: s2,
    s3: s3,
    s4: s4,
    s5: s5,
    s6: s6,
    s7: s7,
    ss1: ss1,
    ss2: ss2,
    ss3: ss3,
    ss4: ss4,
    ss5: ss5,
    ss6: ss6,
    ss7: ss7,
    sz1: sz1,
    sz2: sz2,
    sz3: sz3,
    sz11: sz11,
    sz12: sz12,
    sz13: sz13,
    sz21: sz21,
    sz22: sz22,
    sz23: sz23,
    sz31: sz31,
    sz32: sz32,
    sz33: sz33,
    xgh2: xgh2,
    xgh3: xgh3,
    xgh4: xgh4,
    xh2: xh2,
    xh3: xh3,
    xi2: xi2,
    xi3: xi3,
    xl2: xl2,
    xl3: xl3,
    xl4: xl4,
    nm: nm,
    z1: z1,
    z2: z2,
    z3: z3,
    z11: z11,
    z12: z12,
    z13: z13,
    z21: z21,
    z22: z22,
    z23: z23,
    z31: z31,
    z32: z32,
    z33: z33,
    zmol: zmol,
    zmos: zmos
  };
}
function dsinit(options) {
  var cosim = options.cosim,
    argpo = options.argpo,
    s1 = options.s1,
    s2 = options.s2,
    s3 = options.s3,
    s4 = options.s4,
    s5 = options.s5,
    sinim = options.sinim,
    ss1 = options.ss1,
    ss2 = options.ss2,
    ss3 = options.ss3,
    ss4 = options.ss4,
    ss5 = options.ss5,
    sz1 = options.sz1,
    sz3 = options.sz3,
    sz11 = options.sz11,
    sz13 = options.sz13,
    sz21 = options.sz21,
    sz23 = options.sz23,
    sz31 = options.sz31,
    sz33 = options.sz33,
    t = options.t,
    tc = options.tc,
    gsto = options.gsto,
    mo = options.mo,
    mdot = options.mdot,
    no = options.no,
    nodeo = options.nodeo,
    nodedot = options.nodedot,
    xpidot = options.xpidot,
    z1 = options.z1,
    z3 = options.z3,
    z11 = options.z11,
    z13 = options.z13,
    z21 = options.z21,
    z23 = options.z23,
    z31 = options.z31,
    z33 = options.z33,
    ecco = options.ecco,
    eccsq = options.eccsq;
  var emsq = options.emsq,
    em = options.em,
    argpm = options.argpm,
    inclm = options.inclm,
    mm = options.mm,
    nm = options.nm,
    nodem = options.nodem,
    irez = options.irez,
    atime = options.atime,
    d2201 = options.d2201,
    d2211 = options.d2211,
    d3210 = options.d3210,
    d3222 = options.d3222,
    d4410 = options.d4410,
    d4422 = options.d4422,
    d5220 = options.d5220,
    d5232 = options.d5232,
    d5421 = options.d5421,
    d5433 = options.d5433,
    dedt = options.dedt,
    didt = options.didt,
    dmdt = options.dmdt,
    dnodt = options.dnodt,
    domdt = options.domdt,
    del1 = options.del1,
    del2 = options.del2,
    del3 = options.del3,
    xfact = options.xfact,
    xlamo = options.xlamo,
    xli = options.xli,
    xni = options.xni;
  var f220;
  var f221;
  var f311;
  var f321;
  var f322;
  var f330;
  var f441;
  var f442;
  var f522;
  var f523;
  var f542;
  var f543;
  var g200;
  var g201;
  var g211;
  var g300;
  var g310;
  var g322;
  var g410;
  var g422;
  var g520;
  var g521;
  var g532;
  var g533;
  var sini2;
  var temp;
  var temp1;
  var xno2;
  var ainv2;
  var aonv;
  var cosisq;
  var eoc;
  var q22 = 1.7891679e-6;
  var q31 = 2.1460748e-6;
  var q33 = 2.2123015e-7;
  var root22 = 1.7891679e-6;
  var root44 = 7.3636953e-9;
  var root54 = 2.1765803e-9;
  var rptim = 4.37526908801129966e-3;
  var root32 = 3.7393792e-7;
  var root52 = 1.1428639e-7;
  var znl = 1.5835218e-4;
  var zns = 1.19459e-5;
  irez = 0;
  if (nm < 0.0052359877 && nm > 0.0034906585) {
    irez = 1;
  }
  if (nm >= 8.26e-3 && nm <= 9.24e-3 && em >= 0.5) {
    irez = 2;
  }
  var ses = ss1 * zns * ss5;
  var sis = ss2 * zns * (sz11 + sz13);
  var sls = -zns * ss3 * (sz1 + sz3 - 14.0 - 6.0 * emsq);
  var sghs = ss4 * zns * (sz31 + sz33 - 6.0);
  var shs = -zns * ss2 * (sz21 + sz23);
  if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
    shs = 0.0;
  }
  if (sinim !== 0.0) {
    shs /= sinim;
  }
  var sgs = sghs - cosim * shs;
  dedt = ses + s1 * znl * s5;
  didt = sis + s2 * znl * (z11 + z13);
  dmdt = sls - znl * s3 * (z1 + z3 - 14.0 - 6.0 * emsq);
  var sghl = s4 * znl * (z31 + z33 - 6.0);
  var shll = -znl * s2 * (z21 + z23);
  if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
    shll = 0.0;
  }
  domdt = sgs + sghl;
  dnodt = shs;
  if (sinim !== 0.0) {
    domdt -= cosim / sinim * shll;
    dnodt += shll / sinim;
  }
  var dndt = 0.0;
  var theta = (gsto + tc * rptim) % twoPi;
  em += dedt * t;
  inclm += didt * t;
  argpm += domdt * t;
  nodem += dnodt * t;
  mm += dmdt * t;
  if (irez !== 0) {
    aonv = Math.pow(nm / xke, x2o3);
    if (irez === 2) {
      cosisq = cosim * cosim;
      var emo = em;
      em = ecco;
      var emsqo = emsq;
      emsq = eccsq;
      eoc = em * emsq;
      g201 = -0.306 - (em - 0.64) * 0.440;
      if (em <= 0.65) {
        g211 = 3.616 - 13.2470 * em + 16.2900 * emsq;
        g310 = -19.302 + 117.3900 * em - 228.4190 * emsq + 156.5910 * eoc;
        g322 = -18.9068 + 109.7927 * em - 214.6334 * emsq + 146.5816 * eoc;
        g410 = -41.122 + 242.6940 * em - 471.0940 * emsq + 313.9530 * eoc;
        g422 = -146.407 + 841.8800 * em - 1629.014 * emsq + 1083.4350 * eoc;
        g520 = -532.114 + 3017.977 * em - 5740.032 * emsq + 3708.2760 * eoc;
      } else {
        g211 = -72.099 + 331.819 * em - 508.738 * emsq + 266.724 * eoc;
        g310 = -346.844 + 1582.851 * em - 2415.925 * emsq + 1246.113 * eoc;
        g322 = -342.585 + 1554.908 * em - 2366.899 * emsq + 1215.972 * eoc;
        g410 = -1052.797 + 4758.686 * em - 7193.992 * emsq + 3651.957 * eoc;
        g422 = -3581.690 + 16178.110 * em - 24462.770 * emsq + 12422.520 * eoc;
        if (em > 0.715) {
          g520 = -5149.66 + 29936.92 * em - 54087.36 * emsq + 31324.56 * eoc;
        } else {
          g520 = 1464.74 - 4664.75 * em + 3763.64 * emsq;
        }
      }
      if (em < 0.7) {
        g533 = -919.22770 + 4988.6100 * em - 9064.7700 * emsq + 5542.21 * eoc;
        g521 = -822.71072 + 4568.6173 * em - 8491.4146 * emsq + 5337.524 * eoc;
        g532 = -853.66600 + 4690.2500 * em - 8624.7700 * emsq + 5341.4 * eoc;
      } else {
        g533 = -37995.780 + 161616.52 * em - 229838.20 * emsq + 109377.94 * eoc;
        g521 = -51752.104 + 218913.95 * em - 309468.16 * emsq + 146349.42 * eoc;
        g532 = -40023.880 + 170470.89 * em - 242699.48 * emsq + 115605.82 * eoc;
      }
      sini2 = sinim * sinim;
      f220 = 0.75 * (1.0 + 2.0 * cosim + cosisq);
      f221 = 1.5 * sini2;
      f321 = 1.875 * sinim * (1.0 - 2.0 * cosim - 3.0 * cosisq);
      f322 = -1.875 * sinim * (1.0 + 2.0 * cosim - 3.0 * cosisq);
      f441 = 35.0 * sini2 * f220;
      f442 = 39.3750 * sini2 * sini2;
      f522 = 9.84375 * sinim * (sini2 * (1.0 - 2.0 * cosim - 5.0 * cosisq) + 0.33333333 * (-2.0 + 4.0 * cosim + 6.0 * cosisq));
      f523 = sinim * (4.92187512 * sini2 * (-2.0 - 4.0 * cosim + 10.0 * cosisq) + 6.56250012 * (1.0 + 2.0 * cosim - 3.0 * cosisq));
      f542 = 29.53125 * sinim * (2.0 - 8.0 * cosim + cosisq * (-12.0 + 8.0 * cosim + 10.0 * cosisq));
      f543 = 29.53125 * sinim * (-2.0 - 8.0 * cosim + cosisq * (12.0 + 8.0 * cosim - 10.0 * cosisq));
      xno2 = nm * nm;
      ainv2 = aonv * aonv;
      temp1 = 3.0 * xno2 * ainv2;
      temp = temp1 * root22;
      d2201 = temp * f220 * g201;
      d2211 = temp * f221 * g211;
      temp1 *= aonv;
      temp = temp1 * root32;
      d3210 = temp * f321 * g310;
      d3222 = temp * f322 * g322;
      temp1 *= aonv;
      temp = 2.0 * temp1 * root44;
      d4410 = temp * f441 * g410;
      d4422 = temp * f442 * g422;
      temp1 *= aonv;
      temp = temp1 * root52;
      d5220 = temp * f522 * g520;
      d5232 = temp * f523 * g532;
      temp = 2.0 * temp1 * root54;
      d5421 = temp * f542 * g521;
      d5433 = temp * f543 * g533;
      xlamo = (mo + nodeo + nodeo - (theta + theta)) % twoPi;
      xfact = mdot + dmdt + 2.0 * (nodedot + dnodt - rptim) - no;
      em = emo;
      emsq = emsqo;
    }
    if (irez === 1) {
      g200 = 1.0 + emsq * (-2.5 + 0.8125 * emsq);
      g310 = 1.0 + 2.0 * emsq;
      g300 = 1.0 + emsq * (-6.0 + 6.60937 * emsq);
      f220 = 0.75 * (1.0 + cosim) * (1.0 + cosim);
      f311 = 0.9375 * sinim * sinim * (1.0 + 3.0 * cosim) - 0.75 * (1.0 + cosim);
      f330 = 1.0 + cosim;
      f330 *= 1.875 * f330 * f330;
      del1 = 3.0 * nm * nm * aonv * aonv;
      del2 = 2.0 * del1 * f220 * g200 * q22;
      del3 = 3.0 * del1 * f330 * g300 * q33 * aonv;
      del1 = del1 * f311 * g310 * q31 * aonv;
      xlamo = (mo + nodeo + argpo - theta) % twoPi;
      xfact = mdot + xpidot + dmdt + domdt + dnodt - (no + rptim);
    }
    xli = xlamo;
    xni = no;
    atime = 0.0;
    nm = no + dndt;
  }
  return {
    em: em,
    argpm: argpm,
    inclm: inclm,
    mm: mm,
    nm: nm,
    nodem: nodem,
    irez: irez,
    atime: atime,
    d2201: d2201,
    d2211: d2211,
    d3210: d3210,
    d3222: d3222,
    d4410: d4410,
    d4422: d4422,
    d5220: d5220,
    d5232: d5232,
    d5421: d5421,
    d5433: d5433,
    dedt: dedt,
    didt: didt,
    dmdt: dmdt,
    dndt: dndt,
    dnodt: dnodt,
    domdt: domdt,
    del1: del1,
    del2: del2,
    del3: del3,
    xfact: xfact,
    xlamo: xlamo,
    xli: xli,
    xni: xni
  };
}

function gstimeInternal(jdut1) {
  var tut1 = (jdut1 - 2451545.0) / 36525.0;
  var temp = -6.2e-6 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841;
  temp = temp * deg2rad / 240.0 % twoPi;
  if (temp < 0.0) {
    temp += twoPi;
  }
  return temp;
}
function gstime(first, month, day, hour, minute, second, millisecond) {
  if (first instanceof Date) {
    return gstimeInternal(jday(first));
  } else if (month !== undefined) {
    return gstimeInternal(jday(first, month, day, hour, minute, second, millisecond));
  } else {
    return gstimeInternal(first);
  }
}

function initl(options) {
  var ecco = options.ecco,
    epoch = options.epoch,
    inclo = options.inclo,
    opsmode = options.opsmode;
  var no = options.no;
  var eccsq = ecco * ecco;
  var omeosq = 1.0 - eccsq;
  var rteosq = Math.sqrt(omeosq);
  var cosio = Math.cos(inclo);
  var cosio2 = cosio * cosio;
  var ak = Math.pow(xke / no, x2o3);
  var d1 = 0.75 * j2 * (3.0 * cosio2 - 1.0) / (rteosq * omeosq);
  var delPrime = d1 / (ak * ak);
  var adel = ak * (1.0 - delPrime * delPrime - delPrime * (1.0 / 3.0 + 134.0 * delPrime * delPrime / 81.0));
  delPrime = d1 / (adel * adel);
  no /= 1.0 + delPrime;
  var ao = Math.pow(xke / no, x2o3);
  var sinio = Math.sin(inclo);
  var po = ao * omeosq;
  var con42 = 1.0 - 5.0 * cosio2;
  var con41 = -con42 - cosio2 - cosio2;
  var ainv = 1.0 / ao;
  var posq = po * po;
  var rp = ao * (1.0 - ecco);
  var method = 'n';
  var gsto;
  if (opsmode === 'a') {
    var ts70 = epoch - 7305.0;
    var ds70 = Math.floor(ts70 + 1.0e-8);
    var tfrac = ts70 - ds70;
    var c1 = 1.72027916940703639e-2;
    var thgr70 = 1.7321343856509374;
    var fk5r = 5.07551419432269442e-15;
    var c1p2p = c1 + twoPi;
    gsto = (thgr70 + c1 * ds70 + c1p2p * tfrac + ts70 * ts70 * fk5r) % twoPi;
    if (gsto < 0.0) {
      gsto += twoPi;
    }
  } else {
    gsto = gstime(epoch + 2433281.5);
  }
  return {
    no: no,
    method: method,
    ainv: ainv,
    ao: ao,
    con41: con41,
    con42: con42,
    cosio: cosio,
    cosio2: cosio2,
    eccsq: eccsq,
    omeosq: omeosq,
    posq: posq,
    rp: rp,
    rteosq: rteosq,
    sinio: sinio,
    gsto: gsto
  };
}

function dspace(options) {
  var irez = options.irez,
    d2201 = options.d2201,
    d2211 = options.d2211,
    d3210 = options.d3210,
    d3222 = options.d3222,
    d4410 = options.d4410,
    d4422 = options.d4422,
    d5220 = options.d5220,
    d5232 = options.d5232,
    d5421 = options.d5421,
    d5433 = options.d5433,
    dedt = options.dedt,
    del1 = options.del1,
    del2 = options.del2,
    del3 = options.del3,
    didt = options.didt,
    dmdt = options.dmdt,
    dnodt = options.dnodt,
    domdt = options.domdt,
    argpo = options.argpo,
    argpdot = options.argpdot,
    t = options.t,
    tc = options.tc,
    gsto = options.gsto,
    xfact = options.xfact,
    xlamo = options.xlamo,
    no = options.no;
  var atime = options.atime,
    em = options.em,
    argpm = options.argpm,
    inclm = options.inclm,
    xli = options.xli,
    mm = options.mm,
    xni = options.xni,
    nodem = options.nodem,
    nm = options.nm;
  var fasx2 = 0.13130908;
  var fasx4 = 2.8843198;
  var fasx6 = 0.37448087;
  var g22 = 5.7686396;
  var g32 = 0.95240898;
  var g44 = 1.8014998;
  var g52 = 1.0508330;
  var g54 = 4.4108898;
  var rptim = 4.37526908801129966e-3;
  var stepp = 720.0;
  var stepn = -720.0;
  var step2 = 259200.0;
  var delt;
  var x2li;
  var x2omi;
  var xl;
  var xldot;
  var xnddt;
  var xndt;
  var xomi;
  var dndt = 0.0;
  var ft = 0.0;
  var theta = (gsto + tc * rptim) % twoPi;
  em += dedt * t;
  inclm += didt * t;
  argpm += domdt * t;
  nodem += dnodt * t;
  mm += dmdt * t;
  if (irez !== 0) {
    if (atime === 0.0 || t * atime <= 0.0 || Math.abs(t) < Math.abs(atime)) {
      atime = 0.0;
      xni = no;
      xli = xlamo;
    }
    if (t > 0.0) {
      delt = stepp;
    } else {
      delt = stepn;
    }
    var iretn = 381;
    while (iretn === 381) {
      if (irez !== 2) {
        xndt = del1 * Math.sin(xli - fasx2) + del2 * Math.sin(2.0 * (xli - fasx4)) + del3 * Math.sin(3.0 * (xli - fasx6));
        xldot = xni + xfact;
        xnddt = del1 * Math.cos(xli - fasx2) + 2.0 * del2 * Math.cos(2.0 * (xli - fasx4)) + 3.0 * del3 * Math.cos(3.0 * (xli - fasx6));
        xnddt *= xldot;
      } else {
        xomi = argpo + argpdot * atime;
        x2omi = xomi + xomi;
        x2li = xli + xli;
        xndt = d2201 * Math.sin(x2omi + xli - g22) + d2211 * Math.sin(xli - g22) + d3210 * Math.sin(xomi + xli - g32) + d3222 * Math.sin(-xomi + xli - g32) + d4410 * Math.sin(x2omi + x2li - g44) + d4422 * Math.sin(x2li - g44) + d5220 * Math.sin(xomi + xli - g52) + d5232 * Math.sin(-xomi + xli - g52) + d5421 * Math.sin(xomi + x2li - g54) + d5433 * Math.sin(-xomi + x2li - g54);
        xldot = xni + xfact;
        xnddt = d2201 * Math.cos(x2omi + xli - g22) + d2211 * Math.cos(xli - g22) + d3210 * Math.cos(xomi + xli - g32) + d3222 * Math.cos(-xomi + xli - g32) + d5220 * Math.cos(xomi + xli - g52) + d5232 * Math.cos(-xomi + xli - g52) + 2.0 * (d4410 * Math.cos(x2omi + x2li - g44) + d4422 * Math.cos(x2li - g44) + d5421 * Math.cos(xomi + x2li - g54) + d5433 * Math.cos(-xomi + x2li - g54));
        xnddt *= xldot;
      }
      if (Math.abs(t - atime) >= stepp) {
        iretn = 381;
      } else {
        ft = t - atime;
        iretn = 0;
      }
      if (iretn === 381) {
        xli += xldot * delt + xndt * step2;
        xni += xndt * delt + xnddt * step2;
        atime += delt;
      }
    }
    nm = xni + xndt * ft + xnddt * ft * ft * 0.5;
    xl = xli + xldot * ft + xndt * ft * ft * 0.5;
    if (irez !== 1) {
      mm = xl - 2.0 * nodem + 2.0 * theta;
      dndt = nm - no;
    } else {
      mm = xl - nodem - argpm + theta;
      dndt = nm - no;
    }
    nm = no + dndt;
  }
  return {
    atime: atime,
    em: em,
    argpm: argpm,
    inclm: inclm,
    xli: xli,
    mm: mm,
    xni: xni,
    nodem: nodem,
    dndt: dndt,
    nm: nm
  };
}

var SatRecError;
(function (SatRecError) {
  SatRecError[SatRecError["None"] = 0] = "None";
  SatRecError[SatRecError["MeanEccentricityOutOfRange"] = 1] = "MeanEccentricityOutOfRange";
  SatRecError[SatRecError["MeanMotionBelowZero"] = 2] = "MeanMotionBelowZero";
  SatRecError[SatRecError["PerturbedEccentricityOutOfRange"] = 3] = "PerturbedEccentricityOutOfRange";
  SatRecError[SatRecError["SemiLatusRectumBelowZero"] = 4] = "SemiLatusRectumBelowZero";
  SatRecError[SatRecError["Decayed"] = 6] = "Decayed";
})(SatRecError || (SatRecError = {}));

function sgp4(satrec, tsince) {
  var coseo1;
  var sineo1;
  var cosip;
  var sinip;
  var cosisq;
  var delm;
  var delomg;
  var eo1;
  var argpm;
  var argpp;
  var su;
  var t3;
  var t4;
  var tc;
  var tem5;
  var temp;
  var tempa;
  var tempe;
  var templ;
  var inclm;
  var mm;
  var nm;
  var nodem;
  var xincp;
  var xlm;
  var mp;
  var nodep;
  var temp4 = 1.5e-12;
  satrec.t = tsince;
  satrec.error = SatRecError.None;
  var xmdf = satrec.mo + satrec.mdot * satrec.t;
  var argpdf = satrec.argpo + satrec.argpdot * satrec.t;
  var nodedf = satrec.nodeo + satrec.nodedot * satrec.t;
  argpm = argpdf;
  mm = xmdf;
  var t2 = satrec.t * satrec.t;
  nodem = nodedf + satrec.nodecf * t2;
  tempa = 1.0 - satrec.cc1 * satrec.t;
  tempe = satrec.bstar * satrec.cc4 * satrec.t;
  templ = satrec.t2cof * t2;
  if (satrec.isimp !== 1) {
    delomg = satrec.omgcof * satrec.t;
    var delmtemp = 1.0 + satrec.eta * Math.cos(xmdf);
    delm = satrec.xmcof * (delmtemp * delmtemp * delmtemp - satrec.delmo);
    temp = delomg + delm;
    mm = xmdf + temp;
    argpm = argpdf - temp;
    t3 = t2 * satrec.t;
    t4 = t3 * satrec.t;
    tempa = tempa - satrec.d2 * t2 - satrec.d3 * t3 - satrec.d4 * t4;
    tempe += satrec.bstar * satrec.cc5 * (Math.sin(mm) - satrec.sinmao);
    templ = templ + satrec.t3cof * t3 + t4 * (satrec.t4cof + satrec.t * satrec.t5cof);
  }
  nm = satrec.no;
  var em = satrec.ecco;
  inclm = satrec.inclo;
  if (satrec.method === 'd') {
    tc = satrec.t;
    var dspaceOptions = {
      irez: satrec.irez,
      d2201: satrec.d2201,
      d2211: satrec.d2211,
      d3210: satrec.d3210,
      d3222: satrec.d3222,
      d4410: satrec.d4410,
      d4422: satrec.d4422,
      d5220: satrec.d5220,
      d5232: satrec.d5232,
      d5421: satrec.d5421,
      d5433: satrec.d5433,
      dedt: satrec.dedt,
      del1: satrec.del1,
      del2: satrec.del2,
      del3: satrec.del3,
      didt: satrec.didt,
      dmdt: satrec.dmdt,
      dnodt: satrec.dnodt,
      domdt: satrec.domdt,
      argpo: satrec.argpo,
      argpdot: satrec.argpdot,
      t: satrec.t,
      tc: tc,
      gsto: satrec.gsto,
      xfact: satrec.xfact,
      xlamo: satrec.xlamo,
      no: satrec.no,
      atime: satrec.atime,
      em: em,
      argpm: argpm,
      inclm: inclm,
      xli: satrec.xli,
      mm: mm,
      xni: satrec.xni,
      nodem: nodem,
      nm: nm
    };
    var dspaceResult = dspace(dspaceOptions);
    em = dspaceResult.em;
    argpm = dspaceResult.argpm;
    inclm = dspaceResult.inclm;
    mm = dspaceResult.mm;
    nodem = dspaceResult.nodem;
    nm = dspaceResult.nm;
  }
  if (nm <= 0.0) {
    satrec.error = SatRecError.MeanMotionBelowZero;
    return null;
  }
  var am = Math.pow(xke / nm, x2o3) * tempa * tempa;
  nm = xke / Math.pow(am, 1.5);
  em -= tempe;
  if (em >= 1.0 || em < -0.001) {
    satrec.error = SatRecError.MeanEccentricityOutOfRange;
    return null;
  }
  if (em < 1.0e-6) {
    em = 1.0e-6;
  }
  mm += satrec.no * templ;
  xlm = mm + argpm + nodem;
  nodem %= twoPi;
  argpm %= twoPi;
  xlm %= twoPi;
  mm = (xlm - argpm - nodem) % twoPi;
  var meanElements = {
    am: am,
    em: em,
    im: inclm,
    Om: nodem,
    om: argpm,
    mm: mm,
    nm: nm
  };
  var sinim = Math.sin(inclm);
  var cosim = Math.cos(inclm);
  var ep = em;
  xincp = inclm;
  argpp = argpm;
  nodep = nodem;
  mp = mm;
  sinip = sinim;
  cosip = cosim;
  if (satrec.method === 'd') {
    var dpperParameters = {
      inclo: satrec.inclo,
      init: 'n',
      ep: ep,
      inclp: xincp,
      nodep: nodep,
      argpp: argpp,
      mp: mp,
      opsmode: satrec.operationmode
    };
    var dpperResult = dpper(satrec, dpperParameters);
    ep = dpperResult.ep;
    nodep = dpperResult.nodep;
    argpp = dpperResult.argpp;
    mp = dpperResult.mp;
    xincp = dpperResult.inclp;
    if (xincp < 0.0) {
      xincp = -xincp;
      nodep += pi;
      argpp -= pi;
    }
    if (ep < 0.0 || ep > 1.0) {
      satrec.error = SatRecError.PerturbedEccentricityOutOfRange;
      return null;
    }
  }
  if (satrec.method === 'd') {
    sinip = Math.sin(xincp);
    cosip = Math.cos(xincp);
    satrec.aycof = -0.5 * j3oj2 * sinip;
    if (Math.abs(cosip + 1.0) > 1.5e-12) {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / (1.0 + cosip);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / temp4;
    }
  }
  var axnl = ep * Math.cos(argpp);
  temp = 1.0 / (am * (1.0 - ep * ep));
  var aynl = ep * Math.sin(argpp) + temp * satrec.aycof;
  var xl = mp + argpp + nodep + temp * satrec.xlcof * axnl;
  var u = (xl - nodep) % twoPi;
  eo1 = u;
  tem5 = 9999.9;
  var ktr = 1;
  while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
    sineo1 = Math.sin(eo1);
    coseo1 = Math.cos(eo1);
    tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
    tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
    if (Math.abs(tem5) >= 0.95) {
      if (tem5 > 0.0) {
        tem5 = 0.95;
      } else {
        tem5 = -0.95;
      }
    }
    eo1 += tem5;
    ktr += 1;
  }
  var ecose = axnl * coseo1 + aynl * sineo1;
  var esine = axnl * sineo1 - aynl * coseo1;
  var el2 = axnl * axnl + aynl * aynl;
  var pl = am * (1.0 - el2);
  if (pl < 0.0) {
    satrec.error = SatRecError.SemiLatusRectumBelowZero;
    return null;
  }
  var rl = am * (1.0 - ecose);
  var rdotl = Math.sqrt(am) * esine / rl;
  var rvdotl = Math.sqrt(pl) / rl;
  var betal = Math.sqrt(1.0 - el2);
  temp = esine / (1.0 + betal);
  var sinu = am / rl * (sineo1 - aynl - axnl * temp);
  var cosu = am / rl * (coseo1 - axnl + aynl * temp);
  su = Math.atan2(sinu, cosu);
  var sin2u = (cosu + cosu) * sinu;
  var cos2u = 1.0 - 2.0 * sinu * sinu;
  temp = 1.0 / pl;
  var temp1 = 0.5 * j2 * temp;
  var temp2 = temp1 * temp;
  if (satrec.method === 'd') {
    cosisq = cosip * cosip;
    satrec.con41 = 3.0 * cosisq - 1.0;
    satrec.x1mth2 = 1.0 - cosisq;
    satrec.x7thm1 = 7.0 * cosisq - 1.0;
  }
  var mrt = rl * (1.0 - 1.5 * temp2 * betal * satrec.con41) + 0.5 * temp1 * satrec.x1mth2 * cos2u;
  if (mrt < 1.0) {
    satrec.error = SatRecError.Decayed;
    return null;
  }
  su -= 0.25 * temp2 * satrec.x7thm1 * sin2u;
  var xnode = nodep + 1.5 * temp2 * cosip * sin2u;
  var xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
  var mvt = rdotl - nm * temp1 * satrec.x1mth2 * sin2u / xke;
  var rvdot = rvdotl + nm * temp1 * (satrec.x1mth2 * cos2u + 1.5 * satrec.con41) / xke;
  var sinsu = Math.sin(su);
  var cossu = Math.cos(su);
  var snod = Math.sin(xnode);
  var cnod = Math.cos(xnode);
  var sini = Math.sin(xinc);
  var cosi = Math.cos(xinc);
  var xmx = -snod * cosi;
  var xmy = cnod * cosi;
  var ux = xmx * sinsu + cnod * cossu;
  var uy = xmy * sinsu + snod * cossu;
  var uz = sini * sinsu;
  var vx = xmx * cossu - cnod * sinsu;
  var vy = xmy * cossu - snod * sinsu;
  var vz = sini * cossu;
  var r = {
    x: mrt * ux * earthRadius,
    y: mrt * uy * earthRadius,
    z: mrt * uz * earthRadius
  };
  var v = {
    x: (mvt * ux + rvdot * vx) * vkmpersec,
    y: (mvt * uy + rvdot * vy) * vkmpersec,
    z: (mvt * uz + rvdot * vz) * vkmpersec
  };
  return {
    position: r,
    velocity: v,
    meanElements: meanElements
  };
}

function sgp4init(satrecInit, options) {
  var opsmode = options.opsmode,
    satn = options.satn,
    epoch = options.epoch,
    xbstar = options.xbstar,
    xecco = options.xecco,
    xargpo = options.xargpo,
    xinclo = options.xinclo,
    xmo = options.xmo,
    xno = options.xno,
    xnodeo = options.xnodeo;
  var cosim;
  var sinim;
  var cc1sq;
  var cc2;
  var cc3;
  var coef;
  var coef1;
  var cosio4;
  var em;
  var emsq;
  var eeta;
  var etasq;
  var argpm;
  var nodem;
  var inclm;
  var mm;
  var nm;
  var perige;
  var pinvsq;
  var psisq;
  var qzms24;
  var s1;
  var s2;
  var s3;
  var s4;
  var s5;
  var sfour;
  var ss1;
  var ss2;
  var ss3;
  var ss4;
  var ss5;
  var sz1;
  var sz3;
  var sz11;
  var sz13;
  var sz21;
  var sz23;
  var sz31;
  var sz33;
  var tc;
  var temp;
  var temp1;
  var temp2;
  var temp3;
  var tsi;
  var xpidot;
  var xhdot1;
  var z1;
  var z3;
  var z11;
  var z13;
  var z21;
  var z23;
  var z31;
  var z33;
  var temp4 = 1.5e-12;
  var satrec = satrecInit;
  satrec.isimp = 0;
  satrec.method = 'n';
  satrec.aycof = 0.0;
  satrec.con41 = 0.0;
  satrec.cc1 = 0.0;
  satrec.cc4 = 0.0;
  satrec.cc5 = 0.0;
  satrec.d2 = 0.0;
  satrec.d3 = 0.0;
  satrec.d4 = 0.0;
  satrec.delmo = 0.0;
  satrec.eta = 0.0;
  satrec.argpdot = 0.0;
  satrec.omgcof = 0.0;
  satrec.sinmao = 0.0;
  satrec.t = 0.0;
  satrec.t2cof = 0.0;
  satrec.t3cof = 0.0;
  satrec.t4cof = 0.0;
  satrec.t5cof = 0.0;
  satrec.x1mth2 = 0.0;
  satrec.x7thm1 = 0.0;
  satrec.mdot = 0.0;
  satrec.nodedot = 0.0;
  satrec.xlcof = 0.0;
  satrec.xmcof = 0.0;
  satrec.nodecf = 0.0;
  satrec.irez = 0;
  satrec.d2201 = 0.0;
  satrec.d2211 = 0.0;
  satrec.d3210 = 0.0;
  satrec.d3222 = 0.0;
  satrec.d4410 = 0.0;
  satrec.d4422 = 0.0;
  satrec.d5220 = 0.0;
  satrec.d5232 = 0.0;
  satrec.d5421 = 0.0;
  satrec.d5433 = 0.0;
  satrec.dedt = 0.0;
  satrec.del1 = 0.0;
  satrec.del2 = 0.0;
  satrec.del3 = 0.0;
  satrec.didt = 0.0;
  satrec.dmdt = 0.0;
  satrec.dnodt = 0.0;
  satrec.domdt = 0.0;
  satrec.e3 = 0.0;
  satrec.ee2 = 0.0;
  satrec.peo = 0.0;
  satrec.pgho = 0.0;
  satrec.pho = 0.0;
  satrec.pinco = 0.0;
  satrec.plo = 0.0;
  satrec.se2 = 0.0;
  satrec.se3 = 0.0;
  satrec.sgh2 = 0.0;
  satrec.sgh3 = 0.0;
  satrec.sgh4 = 0.0;
  satrec.sh2 = 0.0;
  satrec.sh3 = 0.0;
  satrec.si2 = 0.0;
  satrec.si3 = 0.0;
  satrec.sl2 = 0.0;
  satrec.sl3 = 0.0;
  satrec.sl4 = 0.0;
  satrec.gsto = 0.0;
  satrec.xfact = 0.0;
  satrec.xgh2 = 0.0;
  satrec.xgh3 = 0.0;
  satrec.xgh4 = 0.0;
  satrec.xh2 = 0.0;
  satrec.xh3 = 0.0;
  satrec.xi2 = 0.0;
  satrec.xi3 = 0.0;
  satrec.xl2 = 0.0;
  satrec.xl3 = 0.0;
  satrec.xl4 = 0.0;
  satrec.xlamo = 0.0;
  satrec.zmol = 0.0;
  satrec.zmos = 0.0;
  satrec.atime = 0.0;
  satrec.xli = 0.0;
  satrec.xni = 0.0;
  satrec.bstar = xbstar;
  satrec.ecco = xecco;
  satrec.argpo = xargpo;
  satrec.inclo = xinclo;
  satrec.mo = xmo;
  satrec.no = xno;
  satrec.nodeo = xnodeo;
  satrec.operationmode = opsmode;
  var ss = 78.0 / earthRadius + 1.0;
  var qzms2ttemp = (120.0 - 78.0) / earthRadius;
  var qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;
  satrec.init = 'y';
  satrec.t = 0.0;
  var initlOptions = {
    satn: satn,
    ecco: satrec.ecco,
    epoch: epoch,
    inclo: satrec.inclo,
    no: satrec.no,
    method: satrec.method,
    opsmode: satrec.operationmode
  };
  var initlResult = initl(initlOptions);
  var ao = initlResult.ao,
    con42 = initlResult.con42,
    cosio = initlResult.cosio,
    cosio2 = initlResult.cosio2,
    eccsq = initlResult.eccsq,
    omeosq = initlResult.omeosq,
    posq = initlResult.posq,
    rp = initlResult.rp,
    rteosq = initlResult.rteosq,
    sinio = initlResult.sinio;
  satrec.no = initlResult.no;
  satrec.con41 = initlResult.con41;
  satrec.gsto = initlResult.gsto;
  satrec.a = Math.pow(satrec.no * tumin, -2.0 / 3.0);
  satrec.alta = satrec.a * (1.0 + satrec.ecco) - 1.0;
  satrec.altp = satrec.a * (1.0 - satrec.ecco) - 1.0;
  satrec.error = 0;
  if (omeosq >= 0.0 || satrec.no >= 0.0) {
    satrec.isimp = 0;
    if (rp < 220.0 / earthRadius + 1.0) {
      satrec.isimp = 1;
    }
    sfour = ss;
    qzms24 = qzms2t;
    perige = (rp - 1.0) * earthRadius;
    if (perige < 156.0) {
      sfour = perige - 78.0;
      if (perige < 98.0) {
        sfour = 20.0;
      }
      var qzms24temp = (120.0 - sfour) / earthRadius;
      qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
      sfour = sfour / earthRadius + 1.0;
    }
    pinvsq = 1.0 / posq;
    tsi = 1.0 / (ao - sfour);
    satrec.eta = ao * satrec.ecco * tsi;
    etasq = satrec.eta * satrec.eta;
    eeta = satrec.ecco * satrec.eta;
    psisq = Math.abs(1.0 - etasq);
    coef = qzms24 * Math.pow(tsi, 4.0);
    coef1 = coef / Math.pow(psisq, 3.5);
    cc2 = coef1 * satrec.no * (ao * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq)) + 0.375 * j2 * tsi / psisq * satrec.con41 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
    satrec.cc1 = satrec.bstar * cc2;
    cc3 = 0.0;
    if (satrec.ecco > 1.0e-4) {
      cc3 = -2.0 * coef * tsi * j3oj2 * satrec.no * sinio / satrec.ecco;
    }
    satrec.x1mth2 = 1.0 - cosio2;
    satrec.cc4 = 2.0 * satrec.no * coef1 * ao * omeosq * (satrec.eta * (2.0 + 0.5 * etasq) + satrec.ecco * (0.5 + 2.0 * etasq) - j2 * tsi / (ao * psisq) * (-3.0 * satrec.con41 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * satrec.x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos(2.0 * satrec.argpo)));
    satrec.cc5 = 2.0 * coef1 * ao * omeosq * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);
    cosio4 = cosio2 * cosio2;
    temp1 = 1.5 * j2 * pinvsq * satrec.no;
    temp2 = 0.5 * temp1 * j2 * pinvsq;
    temp3 = -0.46875 * j4 * pinvsq * pinvsq * satrec.no;
    satrec.mdot = satrec.no + 0.5 * temp1 * rteosq * satrec.con41 + 0.0625 * temp2 * rteosq * (13.0 - 78.0 * cosio2 + 137.0 * cosio4);
    satrec.argpdot = -0.5 * temp1 * con42 + 0.0625 * temp2 * (7.0 - 114.0 * cosio2 + 395.0 * cosio4) + temp3 * (3.0 - 36.0 * cosio2 + 49.0 * cosio4);
    xhdot1 = -temp1 * cosio;
    satrec.nodedot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * cosio2) + 2.0 * temp3 * (3.0 - 7.0 * cosio2)) * cosio;
    xpidot = satrec.argpdot + satrec.nodedot;
    satrec.omgcof = satrec.bstar * cc3 * Math.cos(satrec.argpo);
    satrec.xmcof = 0.0;
    if (satrec.ecco > 1.0e-4) {
      satrec.xmcof = -x2o3 * coef * satrec.bstar / eeta;
    }
    satrec.nodecf = 3.5 * omeosq * xhdot1 * satrec.cc1;
    satrec.t2cof = 1.5 * satrec.cc1;
    if (Math.abs(cosio + 1.0) > 1.5e-12) {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / (1.0 + cosio);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / temp4;
    }
    satrec.aycof = -0.5 * j3oj2 * sinio;
    var delmotemp = 1.0 + satrec.eta * Math.cos(satrec.mo);
    satrec.delmo = delmotemp * delmotemp * delmotemp;
    satrec.sinmao = Math.sin(satrec.mo);
    satrec.x7thm1 = 7.0 * cosio2 - 1.0;
    if (2 * pi / satrec.no >= 225.0) {
      satrec.method = 'd';
      satrec.isimp = 1;
      tc = 0.0;
      inclm = satrec.inclo;
      var dscomOptions = {
        epoch: epoch,
        ep: satrec.ecco,
        argpp: satrec.argpo,
        tc: tc,
        inclp: satrec.inclo,
        nodep: satrec.nodeo,
        np: satrec.no,
        e3: satrec.e3,
        ee2: satrec.ee2,
        peo: satrec.peo,
        pgho: satrec.pgho,
        pho: satrec.pho,
        pinco: satrec.pinco,
        plo: satrec.plo,
        se2: satrec.se2,
        se3: satrec.se3,
        sgh2: satrec.sgh2,
        sgh3: satrec.sgh3,
        sgh4: satrec.sgh4,
        sh2: satrec.sh2,
        sh3: satrec.sh3,
        si2: satrec.si2,
        si3: satrec.si3,
        sl2: satrec.sl2,
        sl3: satrec.sl3,
        sl4: satrec.sl4,
        xgh2: satrec.xgh2,
        xgh3: satrec.xgh3,
        xgh4: satrec.xgh4,
        xh2: satrec.xh2,
        xh3: satrec.xh3,
        xi2: satrec.xi2,
        xi3: satrec.xi3,
        xl2: satrec.xl2,
        xl3: satrec.xl3,
        xl4: satrec.xl4,
        zmol: satrec.zmol,
        zmos: satrec.zmos
      };
      var dscomResult = dscom(dscomOptions);
      satrec.e3 = dscomResult.e3;
      satrec.ee2 = dscomResult.ee2;
      satrec.peo = dscomResult.peo;
      satrec.pgho = dscomResult.pgho;
      satrec.pho = dscomResult.pho;
      satrec.pinco = dscomResult.pinco;
      satrec.plo = dscomResult.plo;
      satrec.se2 = dscomResult.se2;
      satrec.se3 = dscomResult.se3;
      satrec.sgh2 = dscomResult.sgh2;
      satrec.sgh3 = dscomResult.sgh3;
      satrec.sgh4 = dscomResult.sgh4;
      satrec.sh2 = dscomResult.sh2;
      satrec.sh3 = dscomResult.sh3;
      satrec.si2 = dscomResult.si2;
      satrec.si3 = dscomResult.si3;
      satrec.sl2 = dscomResult.sl2;
      satrec.sl3 = dscomResult.sl3;
      satrec.sl4 = dscomResult.sl4;
      sinim = dscomResult.sinim;
      cosim = dscomResult.cosim;
      em = dscomResult.em;
      emsq = dscomResult.emsq;
      s1 = dscomResult.s1;
      s2 = dscomResult.s2;
      s3 = dscomResult.s3;
      s4 = dscomResult.s4;
      s5 = dscomResult.s5;
      ss1 = dscomResult.ss1;
      ss2 = dscomResult.ss2;
      ss3 = dscomResult.ss3;
      ss4 = dscomResult.ss4;
      ss5 = dscomResult.ss5;
      sz1 = dscomResult.sz1;
      sz3 = dscomResult.sz3;
      sz11 = dscomResult.sz11;
      sz13 = dscomResult.sz13;
      sz21 = dscomResult.sz21;
      sz23 = dscomResult.sz23;
      sz31 = dscomResult.sz31;
      sz33 = dscomResult.sz33;
      satrec.xgh2 = dscomResult.xgh2;
      satrec.xgh3 = dscomResult.xgh3;
      satrec.xgh4 = dscomResult.xgh4;
      satrec.xh2 = dscomResult.xh2;
      satrec.xh3 = dscomResult.xh3;
      satrec.xi2 = dscomResult.xi2;
      satrec.xi3 = dscomResult.xi3;
      satrec.xl2 = dscomResult.xl2;
      satrec.xl3 = dscomResult.xl3;
      satrec.xl4 = dscomResult.xl4;
      satrec.zmol = dscomResult.zmol;
      satrec.zmos = dscomResult.zmos;
      nm = dscomResult.nm;
      z1 = dscomResult.z1;
      z3 = dscomResult.z3;
      z11 = dscomResult.z11;
      z13 = dscomResult.z13;
      z21 = dscomResult.z21;
      z23 = dscomResult.z23;
      z31 = dscomResult.z31;
      z33 = dscomResult.z33;
      var dpperOptions = {
        inclo: inclm,
        init: satrec.init,
        ep: satrec.ecco,
        inclp: satrec.inclo,
        nodep: satrec.nodeo,
        argpp: satrec.argpo,
        mp: satrec.mo,
        opsmode: satrec.operationmode
      };
      var dpperResult = dpper(satrec, dpperOptions);
      satrec.ecco = dpperResult.ep;
      satrec.inclo = dpperResult.inclp;
      satrec.nodeo = dpperResult.nodep;
      satrec.argpo = dpperResult.argpp;
      satrec.mo = dpperResult.mp;
      argpm = 0.0;
      nodem = 0.0;
      mm = 0.0;
      var dsinitOptions = {
        cosim: cosim,
        emsq: emsq,
        argpo: satrec.argpo,
        s1: s1,
        s2: s2,
        s3: s3,
        s4: s4,
        s5: s5,
        sinim: sinim,
        ss1: ss1,
        ss2: ss2,
        ss3: ss3,
        ss4: ss4,
        ss5: ss5,
        sz1: sz1,
        sz3: sz3,
        sz11: sz11,
        sz13: sz13,
        sz21: sz21,
        sz23: sz23,
        sz31: sz31,
        sz33: sz33,
        t: satrec.t,
        tc: tc,
        gsto: satrec.gsto,
        mo: satrec.mo,
        mdot: satrec.mdot,
        no: satrec.no,
        nodeo: satrec.nodeo,
        nodedot: satrec.nodedot,
        xpidot: xpidot,
        z1: z1,
        z3: z3,
        z11: z11,
        z13: z13,
        z21: z21,
        z23: z23,
        z31: z31,
        z33: z33,
        ecco: satrec.ecco,
        eccsq: eccsq,
        em: em,
        argpm: argpm,
        inclm: inclm,
        mm: mm,
        nm: nm,
        nodem: nodem,
        irez: satrec.irez,
        atime: satrec.atime,
        d2201: satrec.d2201,
        d2211: satrec.d2211,
        d3210: satrec.d3210,
        d3222: satrec.d3222,
        d4410: satrec.d4410,
        d4422: satrec.d4422,
        d5220: satrec.d5220,
        d5232: satrec.d5232,
        d5421: satrec.d5421,
        d5433: satrec.d5433,
        dedt: satrec.dedt,
        didt: satrec.didt,
        dmdt: satrec.dmdt,
        dnodt: satrec.dnodt,
        domdt: satrec.domdt,
        del1: satrec.del1,
        del2: satrec.del2,
        del3: satrec.del3,
        xfact: satrec.xfact,
        xlamo: satrec.xlamo,
        xli: satrec.xli,
        xni: satrec.xni
      };
      var dsinitResult = dsinit(dsinitOptions);
      satrec.irez = dsinitResult.irez;
      satrec.atime = dsinitResult.atime;
      satrec.d2201 = dsinitResult.d2201;
      satrec.d2211 = dsinitResult.d2211;
      satrec.d3210 = dsinitResult.d3210;
      satrec.d3222 = dsinitResult.d3222;
      satrec.d4410 = dsinitResult.d4410;
      satrec.d4422 = dsinitResult.d4422;
      satrec.d5220 = dsinitResult.d5220;
      satrec.d5232 = dsinitResult.d5232;
      satrec.d5421 = dsinitResult.d5421;
      satrec.d5433 = dsinitResult.d5433;
      satrec.dedt = dsinitResult.dedt;
      satrec.didt = dsinitResult.didt;
      satrec.dmdt = dsinitResult.dmdt;
      satrec.dnodt = dsinitResult.dnodt;
      satrec.domdt = dsinitResult.domdt;
      satrec.del1 = dsinitResult.del1;
      satrec.del2 = dsinitResult.del2;
      satrec.del3 = dsinitResult.del3;
      satrec.xfact = dsinitResult.xfact;
      satrec.xlamo = dsinitResult.xlamo;
      satrec.xli = dsinitResult.xli;
      satrec.xni = dsinitResult.xni;
    }
    if (satrec.isimp !== 1) {
      cc1sq = satrec.cc1 * satrec.cc1;
      satrec.d2 = 4.0 * ao * tsi * cc1sq;
      temp = satrec.d2 * tsi * satrec.cc1 / 3.0;
      satrec.d3 = (17.0 * ao + sfour) * temp;
      satrec.d4 = 0.5 * temp * ao * tsi * (221.0 * ao + 31.0 * sfour) * satrec.cc1;
      satrec.t3cof = satrec.d2 + 2.0 * cc1sq;
      satrec.t4cof = 0.25 * (3.0 * satrec.d3 + satrec.cc1 * (12.0 * satrec.d2 + 10.0 * cc1sq));
      satrec.t5cof = 0.2 * (3.0 * satrec.d4 + 12.0 * satrec.cc1 * satrec.d3 + 6.0 * satrec.d2 * satrec.d2 + 15.0 * cc1sq * (2.0 * satrec.d2 + cc1sq));
    }
  }
  sgp4(satrec, 0);
  satrec.init = 'n';
}

function twoline2satrec(longstr1, longstr2) {
  var opsmode = 'i';
  var error = 0;
  var satnum = longstr1.substring(2, 7);
  var epochyr = parseInt(longstr1.substring(18, 20), 10);
  var epochdays = parseFloat(longstr1.substring(20, 32));
  var ndot = parseFloat(longstr1.substring(33, 43));
  var nddot = parseFloat("".concat(longstr1.substring(44, 45), ".").concat(longstr1.substring(45, 50), "E").concat(longstr1.substring(50, 52)));
  var bstar = parseFloat("".concat(longstr1.substring(53, 54), ".").concat(longstr1.substring(54, 59), "E").concat(longstr1.substring(59, 61)));
  var inclo = parseFloat(longstr2.substring(8, 16)) * deg2rad;
  var nodeo = parseFloat(longstr2.substring(17, 25)) * deg2rad;
  var ecco = parseFloat(".".concat(longstr2.substring(26, 33)));
  var argpo = parseFloat(longstr2.substring(34, 42)) * deg2rad;
  var mo = parseFloat(longstr2.substring(43, 51)) * deg2rad;
  var no = parseFloat(longstr2.substring(52, 63)) / xpdotp;
  var year = epochyr < 57 ? epochyr + 2000 : epochyr + 1900;
  var mdhmsResult = days2mdhms(year, epochdays);
  var mon = mdhmsResult.mon,
    day = mdhmsResult.day,
    hr = mdhmsResult.hr,
    minute = mdhmsResult.minute,
    sec = mdhmsResult.sec;
  var jdsatepoch = jday(year, mon, day, hr, minute, sec);
  var satrec = {
    error: error,
    satnum: satnum,
    epochyr: epochyr,
    epochdays: epochdays,
    ndot: ndot,
    nddot: nddot,
    bstar: bstar,
    inclo: inclo,
    nodeo: nodeo,
    ecco: ecco,
    argpo: argpo,
    mo: mo,
    no: no,
    jdsatepoch: jdsatepoch
  };
  sgp4init(satrec, {
    opsmode: opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 2433281.5,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}
function json2satrec(jsonobj) {
  var opsmode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'i';
  var error = 0;
  var satnum = jsonobj.NORAD_CAT_ID.toString();
  var epoch = new Date(jsonobj.EPOCH + 'Z');
  var year = epoch.getUTCFullYear();
  var epochyr = Number(year.toString().slice(-2));
  var epochdays = (epoch.valueOf() - new Date(Date.UTC(year, 0, 1, 0, 0, 0)).valueOf()) / (86400 * 1000) + 1;
  var ndot = Number(jsonobj.MEAN_MOTION_DOT);
  var nddot = Number(jsonobj.MEAN_MOTION_DDOT);
  var bstar = Number(jsonobj.BSTAR);
  var inclo = Number(jsonobj.INCLINATION) * deg2rad;
  var nodeo = Number(jsonobj.RA_OF_ASC_NODE) * deg2rad;
  var ecco = Number(jsonobj.ECCENTRICITY);
  var argpo = Number(jsonobj.ARG_OF_PERICENTER) * deg2rad;
  var mo = Number(jsonobj.MEAN_ANOMALY) * deg2rad;
  var no = Number(jsonobj.MEAN_MOTION) / xpdotp;
  var mdhmsResult = days2mdhms(year, epochdays);
  var mon = mdhmsResult.mon,
    day = mdhmsResult.day,
    hr = mdhmsResult.hr,
    minute = mdhmsResult.minute,
    sec = mdhmsResult.sec;
  var jdsatepoch = jday(year, mon, day, hr, minute, sec);
  var satrec = {
    error: error,
    satnum: satnum,
    epochyr: epochyr,
    epochdays: epochdays,
    ndot: ndot,
    nddot: nddot,
    bstar: bstar,
    inclo: inclo,
    nodeo: nodeo,
    ecco: ecco,
    argpo: argpo,
    mo: mo,
    no: no,
    jdsatepoch: jdsatepoch
  };
  sgp4init(satrec, {
    opsmode: opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 2433281.5,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}

function propagate(satrec) {
  for (var _len = arguments.length, jdayArgs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    jdayArgs[_key - 1] = arguments[_key];
  }
  var j = jday.apply(void 0, jdayArgs);
  var m = (j - satrec.jdsatepoch) * minutesPerDay;
  return sgp4(satrec, m);
}

var earthRotation = 7.292115E-5;
var c = 299792.458;
function dopplerFactor(observerCoordsEcf, positionEcf, velocityEcf) {
  var rangeX = positionEcf.x - observerCoordsEcf.x;
  var rangeY = positionEcf.y - observerCoordsEcf.y;
  var rangeZ = positionEcf.z - observerCoordsEcf.z;
  var length = Math.sqrt(Math.pow(rangeX, 2) + Math.pow(rangeY, 2) + Math.pow(rangeZ, 2));
  var rangeVel = {
    x: velocityEcf.x + earthRotation * observerCoordsEcf.y,
    y: velocityEcf.y - earthRotation * observerCoordsEcf.x,
    z: velocityEcf.z
  };
  var rangeRate = (rangeX * rangeVel.x + rangeY * rangeVel.y + rangeZ * rangeVel.z) / length;
  return 1 - rangeRate / c;
}

function radiansToDegrees(radians) {
  return radians * rad2deg;
}
function degreesToRadians(degrees) {
  return degrees * deg2rad;
}
function degreesLat(radians) {
  if (radians < -pi / 2 || radians > pi / 2) {
    throw new RangeError('Latitude radians must be in range [-pi/2; pi/2].');
  }
  return radiansToDegrees(radians);
}
function degreesLong(radians) {
  if (radians < -pi || radians > pi) {
    throw new RangeError('Longitude radians must be in range [-pi; pi].');
  }
  return radiansToDegrees(radians);
}
function radiansLat(degrees) {
  if (degrees < -90 || degrees > 90) {
    throw new RangeError('Latitude degrees must be in range [-90; 90].');
  }
  return degreesToRadians(degrees);
}
function radiansLong(degrees) {
  if (degrees < -180 || degrees > 180) {
    throw new RangeError('Longitude degrees must be in range [-180; 180].');
  }
  return degreesToRadians(degrees);
}
function geodeticToEcf(_ref) {
  var longitude = _ref.longitude,
    latitude = _ref.latitude,
    height = _ref.height;
  var a = 6378.137;
  var b = 6356.7523142;
  var f = (a - b) / a;
  var e2 = 2 * f - f * f;
  var normal = a / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
  var x = (normal + height) * Math.cos(latitude) * Math.cos(longitude);
  var y = (normal + height) * Math.cos(latitude) * Math.sin(longitude);
  var z = (normal * (1 - e2) + height) * Math.sin(latitude);
  return {
    x: x,
    y: y,
    z: z
  };
}
function eciToGeodetic(eci, gmst) {
  var a = 6378.137;
  var b = 6356.7523142;
  var R = Math.sqrt(eci.x * eci.x + eci.y * eci.y);
  var f = (a - b) / a;
  var e2 = 2 * f - f * f;
  var longitude = Math.atan2(eci.y, eci.x) - gmst;
  while (longitude < -pi) {
    longitude += twoPi;
  }
  while (longitude > pi) {
    longitude -= twoPi;
  }
  var kmax = 20;
  var k = 0;
  var latitude = Math.atan2(eci.z, Math.sqrt(eci.x * eci.x + eci.y * eci.y));
  var C;
  while (k++ < kmax) {
    C = 1 / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
    latitude = Math.atan2(eci.z + a * C * e2 * Math.sin(latitude), R);
  }
  var height = R / Math.cos(latitude) - a * C;
  return {
    longitude: longitude,
    latitude: latitude,
    height: height
  };
}
function ecfToEci(ecf, gmst) {
  var X = ecf.x * Math.cos(gmst) - ecf.y * Math.sin(gmst);
  var Y = ecf.x * Math.sin(gmst) + ecf.y * Math.cos(gmst);
  var Z = ecf.z;
  return {
    x: X,
    y: Y,
    z: Z
  };
}
function eciToEcf(eci, gmst) {
  var x = eci.x * Math.cos(gmst) + eci.y * Math.sin(gmst);
  var y = eci.x * -Math.sin(gmst) + eci.y * Math.cos(gmst);
  var z = eci.z;
  return {
    x: x,
    y: y,
    z: z
  };
}
function topocentric(observerGeodetic, satelliteEcf) {
  var longitude = observerGeodetic.longitude,
    latitude = observerGeodetic.latitude;
  var observerEcf = geodeticToEcf(observerGeodetic);
  var rx = satelliteEcf.x - observerEcf.x;
  var ry = satelliteEcf.y - observerEcf.y;
  var rz = satelliteEcf.z - observerEcf.z;
  var topS = Math.sin(latitude) * Math.cos(longitude) * rx + Math.sin(latitude) * Math.sin(longitude) * ry - Math.cos(latitude) * rz;
  var topE = -Math.sin(longitude) * rx + Math.cos(longitude) * ry;
  var topZ = Math.cos(latitude) * Math.cos(longitude) * rx + Math.cos(latitude) * Math.sin(longitude) * ry + Math.sin(latitude) * rz;
  return {
    topS: topS,
    topE: topE,
    topZ: topZ
  };
}
function topocentricToLookAngles(tc) {
  var topS = tc.topS,
    topE = tc.topE,
    topZ = tc.topZ;
  var rangeSat = Math.sqrt(topS * topS + topE * topE + topZ * topZ);
  var El = Math.asin(topZ / rangeSat);
  var Az = Math.atan2(-topE, topS) + pi;
  return {
    azimuth: Az,
    elevation: El,
    rangeSat: rangeSat
  };
}
function ecfToLookAngles(observerGeodetic, satelliteEcf) {
  var topocentricCoords = topocentric(observerGeodetic, satelliteEcf);
  return topocentricToLookAngles(topocentricCoords);
}

function sunPos(jday) {
  var tut1 = (jday - 2451545) / 36525;
  var meanlong = (280.460 + 36000.77 * tut1) % 360;
  var ttdb = tut1;
  var meananomaly = (357.5277233 + 35999.05034 * ttdb * deg2rad) % twoPi;
  if (meananomaly < 0) {
    meananomaly += twoPi;
  }
  var eclplong_raw = (meanlong + 1.914666471 * Math.sin(meananomaly) + 0.019994643 * Math.sin(2.0 * meananomaly)) % 360.0 * deg2rad;
  var obliquity = (23.439291 - 0.0130042 * ttdb) * deg2rad;
  var magr = 1.000140612 - 0.016708617 * Math.cos(meananomaly) - 0.000139589 * Math.cos(2.0 * meananomaly);
  var rsun = [magr * Math.cos(eclplong_raw), magr * Math.cos(obliquity) * Math.sin(eclplong_raw), magr * Math.sin(obliquity) * Math.sin(eclplong_raw)];
  var rtasc_raw = Math.atan(Math.cos(obliquity) * Math.tan(eclplong_raw));
  var rtasc = rtasc_raw;
  if (Math.abs(eclplong_raw - rtasc) > pi * 0.5) {
    rtasc += 0.5 * pi * Math.round((eclplong_raw - rtasc_raw) / (0.5 * pi));
  }
  var decl = Math.asin(Math.sin(obliquity) * Math.sin(eclplong_raw));
  return {
    rsun: rsun,
    rtasc: rtasc,
    decl: decl
  };
}

const satellite = { gstime, propagate, eciToGeodetic, json2satrec, degreesLat, degreesLong };
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cosmodromes, capitals, getSatColour, getSatOperator } from '/static/js/data.js?v=4';
import { getConstellationName, WEATHER, STATIONS, ALL_CONSTELLATION_NAMES, DEFAULT_OFF_CONSTELLATIONS } from '/static/js/constellations.js?v=5';

const TRACK_STEP_SECONDS = 30;
const TRACK_SURFACE_OFFSET = 1.001;

const IS_AUTHENTICATED = window.IS_AUTHENTICATED === true;
const LOCKED_COLOUR = '#33475a';

const COLOUR_TO_COUNTRY = {
    'red':     'Russia',
    'blue':    'USA',
    'yellow':  'China',
    'cyan':    'Europe',
    'orange':  'India',
    'purple':  'Japan',
    '#00ff99': 'South Korea',
    '#633154': 'Canada',
    '#33dd55': 'Brazil',
    '#ff99cc': 'Israel',
    '#ff6644': 'TÃ¼rkiye',
    '#fadc8a': 'Thailand',
    '#00ff88': 'International',
    '#2a5a6a': 'Other',
};

function _orbitType(altKm) {
    if (altKm < 2000)  return 'LEO';
    if (altKm < 34000) return 'MEO';
    if (altKm < 37000) return 'GEO';
    return 'HEO';
}

const activeCountries = new Set(Object.values(COLOUR_TO_COUNTRY));
const activeOrbits    = new Set(['LEO', 'MEO', 'GEO', 'HEO']);

function _meshVisible(mesh) {
    const { constellation, country, orbitType } = mesh.userData;
    return visibleConstellations.has(constellation)
        && activeCountries.has(country)
        && activeOrbits.has(orbitType);
}

export function toggleCountryFilter(country, on) {
    on ? activeCountries.add(country) : activeCountries.delete(country);
    for (const entry of sat_meshes) entry.mesh.visible = _meshVisible(entry.mesh);
}

export function toggleOrbitFilter(orbit, on) {
    on ? activeOrbits.add(orbit) : activeOrbits.delete(orbit);
    for (const entry of sat_meshes) entry.mesh.visible = _meshVisible(entry.mesh);
}

const _matCache = {};
function _getMat(color) {
    if (!_matCache[color]) _matCache[color] = new THREE.MeshBasicMaterial({ color });
    return _matCache[color];
}

export var GMT = satellite.gstime(new Date());
export const scene = new THREE.Scene();
export const markers = [];
export const sat_meshes = [];
window.sat_meshes = sat_meshes;
export let activeTrackEntry = null;

const visibleConstellations = new Set(
    ALL_CONSTELLATION_NAMES.filter(n => !DEFAULT_OFF_CONSTELLATIONS.has(n))
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color('#060d18');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true;
controls.minDistance = 1.5;

const geometry = new THREE.SphereGeometry(1, 64, 32);
const loader = new THREE.TextureLoader();
const texture = loader.load('/static/img/country-outlines-4k.png');
const material = new THREE.MeshBasicMaterial({ map: texture });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const light = new THREE.PointLight('white', 1);
light.position.set(5, 5, 5);
scene.add(light);

function buildGroundTrack(satrec) {
    const durationSeconds = 1440 * 60;
    const steps = Math.ceil(durationSeconds / TRACK_STEP_SECONDS);
    const now = new Date();
    const points = [];
    const colors = [];
    const startColor = new THREE.Color('#ff4444');
    const endColor = new THREE.Color('#00ff88');
    const lerpedColor = new THREE.Color();
    for (let i = 0; i <= steps; i++) {
        const t = new Date(now.getTime() + i * TRACK_STEP_SECONDS * 1000);
        const gmt = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (!pv || !pv.position) continue;
        const gd = satellite.eciToGeodetic(pv.position, gmt);
        const lat = gd.latitude;
        const lon = gd.longitude;
        const x = Math.cos(lat) * Math.cos(lon) * TRACK_SURFACE_OFFSET;
        const y = Math.sin(lat) * TRACK_SURFACE_OFFSET;
        const z = -Math.cos(lat) * Math.sin(lon) * TRACK_SURFACE_OFFSET;
        points.push(new THREE.Vector3(x, y, z));
        lerpedColor.lerpColors(startColor, endColor, i / steps);
        colors.push(lerpedColor.r, lerpedColor.g, lerpedColor.b);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return [line];
}

export function createTrackLines(segments) {
    return segments;
}

export function removeTrackLines(lines) {
    for (const line of lines) {
        scene.remove(line);
        line.geometry.dispose();
    }
}

export function setActiveTrackEntry(entry) {
    activeTrackEntry = entry;
}

function placeSatMesh(sat_response, colour, isFree = false) {
    const locked = !IS_AUTHENTICATED && !isFree;
    const sat = new THREE.Mesh(
        new THREE.ConeGeometry(0.012, 0.016, 4),
        _getMat(locked ? LOCKED_COLOUR : colour)
    );
    sat.rotation.set(0, Math.PI / 4, 0);
    const sat_rec = satellite.json2satrec(sat_response);
    const positionAndVelocity = satellite.propagate(sat_rec, new Date());
    if (!positionAndVelocity || !positionAndVelocity.position) return;
    const positionECI = positionAndVelocity.position;
    const geoPos = satellite.eciToGeodetic(positionECI, GMT);
    const latRad = geoPos.latitude;
    const lonRad = geoPos.longitude;
    const sat_height = geoPos.height;
    const scale = 1 + (sat_height / 6371);
    sat.position.set(
        Math.cos(latRad) * Math.cos(lonRad) * scale,
        Math.sin(latRad) * scale,
        -Math.cos(latRad) * Math.sin(lonRad) * scale
    );
    sat.userData.name = sat_response.OBJECT_NAME;
    sat.userData.type = 'sat';
    sat.userData.locked = locked;
    sat.userData.constellation = getConstellationName(sat_response.OBJECT_NAME);
    sat.userData.country = COLOUR_TO_COUNTRY[colour] || 'Other';
    sat.userData.orbitType = _orbitType(sat_height);
    sat.visible = _meshVisible(sat);
    scene.add(sat);
    sat_meshes.push({ satrec: sat_rec, mesh: sat, trackLines: [] });
}

const FREE_CONSTELLATIONS = new Set([...WEATHER, ...STATIONS, 'STARLINK']);

async function fetchCategory(category, attempt = 0) {
    try {
        const response = await fetch(`/dynamic/sats/${category}.json`);
        if (!response.ok) return 0;
        const data = await response.json();
        if (!Array.isArray(data)) return 0;
        for (const sat of data) {
            const constName = getConstellationName(sat.OBJECT_NAME);
            const isFree = FREE_CONSTELLATIONS.has(constName);
            placeSatMesh(sat, getSatColour(sat.OBJECT_NAME), isFree);
        }
        return data.length;
    } catch (e) {
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            return fetchCategory(category, attempt + 1);
        }
        console.warn(`fetchCategory(${category}) failed:`, e);
        return 0;
    }
}

function placeGroundMarker(lat, lon, colour, name, size = 0.005) {
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);
    const x = Math.cos(latRad) * Math.cos(lonRad);
    const y = Math.sin(latRad);
    const z = -Math.cos(latRad) * Math.sin(lonRad);
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 8),
        new THREE.MeshBasicMaterial({ color: colour })
    );
    marker.position.set(x, y, z);
    scene.add(marker);
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(size * 3, 16, 8),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.2 })
    );
    glow.position.set(x, y, z);
    glow.userData.name = name;
    scene.add(glow);
    markers.push(glow);
}

export function addCityMarkerToScene(city) {
    placeGroundMarker(city.lat, city.lon, 'green', city.name);
}

export function toggleConstellation(const_name, visible) {
    if (visible) {
        visibleConstellations.add(const_name);
    } else {
        visibleConstellations.delete(const_name);
    }
    for (const entry of sat_meshes) {
        if (entry.mesh.userData.constellation === const_name) {
            entry.mesh.visible = _meshVisible(entry.mesh);
        }
    }
}

for (const c of cosmodromes) placeGroundMarker(c.lat, c.lon, 'cyan', c.name);
for (const c of capitals)    placeGroundMarker(c.lat, c.lon, 'red',  c.name);

const satLoader = document.getElementById('sat-loader');
let _loaded = 0;
const _updateLoader = (n) => {
    _loaded += n;
    if (satLoader) satLoader.textContent = `Loading satellites... ${_loaded.toLocaleString()}`;
};
const _hideLoader = () => {
    if (satLoader) {
        satLoader.style.transition = 'opacity 0.6s';
        satLoader.style.opacity = '0';
        setTimeout(() => satLoader.style.display = 'none', 650);
    }
};

Promise.all([
    fetchCategory('stations').then(_updateLoader),
    fetchCategory('gnss').then(_updateLoader),
    fetchCategory('weather').then(_updateLoader),
    fetchCategory('resource').then(_updateLoader),
]).then(() => Promise.all([
    fetchCategory('commercial').then(_updateLoader),
    fetchCategory('other').then(_updateLoader),
    fetchCategory('starlink').then(_updateLoader),
])).then(_hideLoader);

const popup = document.createElement('div');
popup.style.cssText = `
    position: fixed;
    background: #0a1628;
    border: 1px solid #1a4a6b;
    color: #00c8ff;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 8px 12px;
    border-radius: 6px;
    pointer-events: auto;
    display: none;
`;
document.body.appendChild(popup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const marker_hits = raycaster.intersectObjects(markers);
    const sat_hits = raycaster.intersectObjects(
        sat_meshes
            .map(s => s.mesh)
            .filter(m => m.visible)
    );

    if (marker_hits.length > 0) {
        popup.innerHTML = `
            <div>${marker_hits[0].object.userData.name}</div>
            <div id="popup-close" style="margin-top:6px; color:#1a6a8b; cursor:pointer; font-size:0.5rem;">CLOSE</div>
        `;
        popup.style.display = 'block';
        popup.style.left = e.clientX + 12 + 'px';
        popup.style.top = e.clientY + 12 + 'px';
        document.getElementById('popup-close').addEventListener('click', () => {
            popup.style.display = 'none';
        });
    } else if (sat_hits.length > 0) {
        if (sat_hits[0].object.userData.locked) {
            if (window.showLoginPopup) window.showLoginPopup();
            return;
        }
        const s = sat_hits[0].object.userData;
        const entry = sat_meshes.find(m => m.mesh === sat_hits[0].object);
        const pv = satellite.propagate(entry.satrec, new Date());
        const gd = satellite.eciToGeodetic(pv.position, GMT);
        if (activeTrackEntry && activeTrackEntry !== entry) {
            removeTrackLines(activeTrackEntry.trackLines);
            activeTrackEntry.trackLines = [];
        }
        if (activeTrackEntry !== entry) {
            entry.trackLines = createTrackLines(buildGroundTrack(entry.satrec));
            activeTrackEntry = entry;
        }
        popup.style.display = 'block';
        popup.style.left = e.clientX + 12 + 'px';
        popup.style.top = e.clientY + 12 + 'px';
        popup.innerHTML = `
            <div>${s.name}</div>
            <div>LAT: ${satellite.degreesLat(gd.latitude).toFixed(2)}Â°</div>
            <div>LON: ${satellite.degreesLong(gd.longitude).toFixed(2)}Â°</div>
            <div>ALT: ${gd.height.toFixed(0)} km</div>
            <div>OPERATOR: ${getSatOperator(s.name)}</div>
            <div id="popup-close" style="margin-top:6px; color:#1a6a8b; cursor:pointer; font-size:0.5rem;">CLOSE</div>
        `;
        document.getElementById('popup-close').addEventListener('click', () => {
            removeTrackLines(activeTrackEntry.trackLines);
            activeTrackEntry.trackLines = [];
            activeTrackEntry = null;
            popup.style.display = 'none';
        });
    }
});

export function focusSat(name) {
    const lname = name.toLowerCase();
    const entry = sat_meshes.find(e => e.mesh.userData.name.toLowerCase().includes(lname));
    if (!entry) return false;

    if (entry.mesh.userData.locked) {
        if (window.showLoginPopup) window.showLoginPopup();
        return true;
    }

    const pos = entry.mesh.position.clone();
    const satDist = pos.length();
    const cameraDist = Math.max(2.5, satDist + 1.5);
    camera.position.copy(pos.normalize().multiplyScalar(cameraDist));
    controls.update();

    const pv = satellite.propagate(entry.satrec, new Date());
    if (!pv || !pv.position) return true;
    const gd = satellite.eciToGeodetic(pv.position, GMT);
    const s = entry.mesh.userData;

    if (activeTrackEntry && activeTrackEntry !== entry) {
        removeTrackLines(activeTrackEntry.trackLines);
        activeTrackEntry.trackLines = [];
    }
    if (activeTrackEntry !== entry) {
        entry.trackLines = createTrackLines(buildGroundTrack(entry.satrec));
        activeTrackEntry = entry;
    }

    popup.style.display = 'block';
    popup.style.left = (window.innerWidth / 2) + 'px';
    popup.style.top = (window.innerHeight / 2) + 'px';
    popup.innerHTML = `
        <div>${s.name}</div>
        <div>LAT: ${satellite.degreesLat(gd.latitude).toFixed(2)}Â°</div>
        <div>LON: ${satellite.degreesLong(gd.longitude).toFixed(2)}Â°</div>
        <div>ALT: ${gd.height.toFixed(0)} km</div>
        <div>OPERATOR: ${getSatOperator(s.name)}</div>
        <div id="popup-close" style="margin-top:6px; color:#1a6a8b; cursor:pointer; font-size:0.5rem;">CLOSE</div>
    `;
    document.getElementById('popup-close').addEventListener('click', () => {
        removeTrackLines(activeTrackEntry.trackLines);
        activeTrackEntry.trackLines = [];
        activeTrackEntry = null;
        popup.style.display = 'none';
    });
    return true;
}

let _animFrame = 0;
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (++_animFrame % 4 === 0) {
        const now = new Date();
        GMT = satellite.gstime(now);
        for (const entry of sat_meshes) {
            if (!entry.mesh.visible) continue;
            const pv = satellite.propagate(entry.satrec, now);
            if (!pv || !pv.position) continue;
            const geoPos = satellite.eciToGeodetic(pv.position, GMT);
            const latRad = geoPos.latitude;
            const lonRad = geoPos.longitude;
            const scale = 1 + (geoPos.height / 6371);
            entry.mesh.position.set(
                Math.cos(latRad) * Math.cos(lonRad) * scale,
                Math.sin(latRad) * scale,
                -Math.cos(latRad) * Math.sin(lonRad) * scale
            );
        }
    }
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
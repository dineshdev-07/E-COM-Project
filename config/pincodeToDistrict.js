const PIN_RANGES = [
  [600001, 600119, "Chennai"],
  [601101, 601302, "Thiruvallur"],
  [600201, 600213, "Kanchipuram"],
  [631001, 631811, "Kanchipuram"],
  [603001, 603402, "Chengalpattu"],
  [632001, 632602, "Vellore"],
  [635601, 635901, "Tirupattur"],
  [632401, 632519, "Ranipet"],
  [604001, 606907, "Tiruvannamalai"],
  [605001, 605902, "Villupuram"],
  [606201, 606213, "Kallakurichi"],
  [607001, 608902, "Cuddalore"],
  [636001, 636451, "Salem"],
  [637001, 638115, "Namakkal"],
  [638001, 638812, "Erode"],
  [641601, 641697, "Tiruppur"],
  [641001, 642154, "Coimbatore"],
  [643001, 643253, "Nilgiris"],
  [636701, 636812, "Dharmapuri"],
  [635001, 635206, "Krishnagiri"],
  [621101, 621220, "Perambalur"],
  [621701, 621806, "Ariyalur"],
  [620001, 621730, "Tiruchirappalli"],
  [639001, 639206, "Karur"],
  [613001, 614904, "Thanjavur"],
  [610001, 612902, "Tiruvarur"],
  [609101, 611402, "Nagapattinam"],
  [609001, 609099, "Mayiladuthurai"],
  [622001, 622515, "Pudukkottai"],
  [623001, 623499, "Sivaganga"],
  [625001, 625704, "Madurai"],
  [625501, 625582, "Theni"],
  [624001, 624803, "Dindigul"],
  [626001, 626213, "Virudhunagar"],
  [623501, 623806, "Ramanathapuram"],
  [627351, 628952, "Thoothukudi"],
  [627001, 627350, "Tirunelveli"],
  [627801, 627862, "Tenkasi"],
  [629001, 629901, "Kanniyakumari"],
];

const ALIAS_MAP = {
  trichy: "Tiruchirappalli",
  tiruchirappalli: "Tiruchirappalli",
  tiruchirapalli: "Tiruchirappalli",
  tiruchi: "Tiruchirappalli",
  tuticorin: "Thoothukudi",
  thoothukudi: "Thoothukudi",
  thoothukudy: "Thoothukudi",
  kanyakumari: "Kanniyakumari",
  kanniyakumari: "Kanniyakumari",
  chennai: "Chennai",
  thiruvallur: "Thiruvallur",
  kanchipuram: "Kanchipuram",
  chengalpattu: "Chengalpattu",
  vellore: "Vellore",
  tirupattur: "Tirupattur",
  ranipet: "Ranipet",
  tiruvannamalai: "Tiruvannamalai",
  villupuram: "Villupuram",
  kallakurichi: "Kallakurichi",
  cuddalore: "Cuddalore",
  salem: "Salem",
  namakkal: "Namakkal",
  erode: "Erode",
  tiruppur: "Tiruppur",
  coimbatore: "Coimbatore",
  nilgiris: "Nilgiris",
  dharmapuri: "Dharmapuri",
  krishnagiri: "Krishnagiri",
  perambalur: "Perambalur",
  ariyalur: "Ariyalur",
  karur: "Karur",
  thanjavur: "Thanjavur",
  tiruvarur: "Tiruvarur",
  nagapattinam: "Nagapattinam",
  mayiladuthurai: "Mayiladuthurai",
  pudukkottai: "Pudukkottai",
  sivaganga: "Sivaganga",
  madurai: "Madurai",
  theni: "Theni",
  dindigul: "Dindigul",
  virudhunagar: "Virudhunagar",
  ramanathapuram: "Ramanathapuram",
  tirunelveli: "Tirunelveli",
  tenkasi: "Tenkasi",
};

const normalise = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export const resolveDistrict = (input) => {
  if (!input) return null;
  const str = String(input).trim();
  if (/^\d{5,6}$/.test(str)) {
    const pin = parseInt(str, 10);
    for (const [start, end, district] of PIN_RANGES) {
      if (pin >= start && pin <= end) return district;
    }
    return null;
  }

  const key = normalise(str);
  if (ALIAS_MAP[key]) return ALIAS_MAP[key];

  for (const [alias, district] of Object.entries(ALIAS_MAP)) {
    if (key.startsWith(alias) || key.includes(alias)) return district;
  }

  return null;
};

export const isSameDistrict = (areaA, areaB) => {
  const dA = resolveDistrict(areaA);
  const dB = resolveDistrict(areaB);
  if (!dA || !dB) return false;
  return dA.toLowerCase() === dB.toLowerCase();
};

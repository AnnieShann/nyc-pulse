// Reliable stock thumbnails for venues that have no live user photo. Each venue
// is assigned a UNIQUE cover by its global index (see spotPhotoIndex in App), so
// no two venues share a preview. All Unsplash IDs below are verified to resolve.

const BASE = 'https://images.unsplash.com/';
const PARAMS = '?w=500&h=500&fit=crop&q=60';

// ~84 verified, de-duped photo IDs (food / bars / cafés / interiors / city /
// parks / museums / shops). Pool size > number of venues → unique covers.
const POOL: string[] = [
  'photo-1517248135467-4c7edcad34c4', 'photo-1414235077428-338989a2e8c0', 'photo-1555396273-367ea4eb4db5',
  'photo-1552566626-52f8b828add9', 'photo-1466978913421-dad2ebd01d17', 'photo-1559339352-11d035aa65de',
  'photo-1424847651672-bf20a4b0982b', 'photo-1514933651103-005eec06c04b', 'photo-1470337458703-46ad1756a187',
  'photo-1543007630-9710e4a00a20', 'photo-1518998053901-5348d3961a04', 'photo-1554907984-15263bfd63bd',
  'photo-1580537659466-0a9bfa916a54', 'photo-1574182245530-967d9b3831af', 'photo-1605429523419-d828acb941d9',
  'photo-1496905583330-eb54c7e5915a', 'photo-1519331379826-f10be5486c6f', 'photo-1496442226666-8d4d0e62e6e9',
  'photo-1522083165195-3424ed129620', 'photo-1441986300917-64674bd600d8', 'photo-1567401893414-76b7b1e5a7a5',
  'photo-1556122071-e404eaedb77f', 'photo-1474487548417-781cb71495f3', 'photo-1517090504586-fde19ea6066f',
  'photo-1581262177000-8139a463e531', 'photo-1480714378408-67cf0d13bc1b', 'photo-1449824913935-59a10b8d2000',
  'photo-1551782450-a2132b4ba21d', 'photo-1565299624946-b28f40a0ae38', 'photo-1504674900247-0877df9cc836',
  'photo-1473093295043-cdd812d0e601', 'photo-1540189549336-e6e99c3679fe', 'photo-1546069901-ba9599a7e63c',
  'photo-1567620905732-2d1ec7ab7445', 'photo-1565958011703-44f9829ba187', 'photo-1482049016688-2d3e1b311543',
  'photo-1476224203421-9ac39bcb3327', 'photo-1551024601-bec78aea704b', 'photo-1488900128323-21503983a07e',
  'photo-1495474472287-4d71bcdd2085', 'photo-1509042239860-f550ce710b93', 'photo-1521017432531-fbd92d768814',
  'photo-1559925393-8be0ec4767c8', 'photo-1485182708500-e8f1f318ba72', 'photo-1517457373958-b7bdd4587205',
  'photo-1528605248644-14dd04022da1', 'photo-1533777857889-4be7c70b33f7', 'photo-1428515613728-6b4607e44363',
  'photo-1487958449943-2429e8be8625', 'photo-1493857671505-72967e2e2760', 'photo-1517991104123-1d56a6e81ed9',
  'photo-1531058020387-3be344556be6', 'photo-1551218808-94e220e084d2', 'photo-1559056199-641a0ac8b55e',
  'photo-1592861956120-e524fc739696', 'photo-1600891964092-4316c288032e', 'photo-1559054663-e8d23213f55c',
  'photo-1485963631004-f2f00b1d6606', 'photo-1525610553991-2bede1a236e2', 'photo-1466637574441-749b8f19452f',
  'photo-1498654896293-37aacf113fd9', 'photo-1432139555190-58524dae6a55', 'photo-1550966871-3ed3cdb5ed0c',
  'photo-1574936145840-28808d77a0b6', 'photo-1455619452474-d2be8b1e70cd', 'photo-1525193612562-0ec53b0e5d7c',
  'photo-1554118811-1e0d58224f24', 'photo-1564759224907-65b945ff0e84', 'photo-1550547660-d9450f859349',
  'photo-1565299507177-b0ac66763828', 'photo-1551183053-bf91a1d81141', 'photo-1473093226795-af9932fe5856',
  'photo-1565895405138-6c3a1555da6a', 'photo-1481833761820-0509d3217039', 'photo-1432139509613-5c4255815697',
  'photo-1606787366850-de6330128bfc', 'photo-1576867757603-05b134ebc379', 'photo-1521305916504-4a1121188589',
  'photo-1504113888839-1c8eb50233d3', 'photo-1485962398705-ef6a13c41e8f', 'photo-1559561853-08451507cbe7',
];

const P = POOL.length;
const url = (id: string) => BASE + id + PARAMS;
const norm = (i: number) => ((i % P) + P) % P;

// The unique cover for a venue at global index `index`.
export function venueCover(index: number): string {
  return url(POOL[norm(index)]);
}

// `count` distinct photos for a venue — first one is the cover (unique per venue).
export function venuePhotos(index: number, count: number): string[] {
  const base = norm(index);
  const strides = [0, 29, 53, 17, 41, 11, 67, 7, 23, 47];
  const out: string[] = [];
  const used = new Set<number>();
  for (let k = 0; k < strides.length && out.length < count; k++) {
    const i = norm(base + strides[k]);
    if (!used.has(i)) {
      used.add(i);
      out.push(url(POOL[i]));
    }
  }
  return out;
}

import type { KoreaRegion } from './korea-regions';
import { getRegionByAreaCode } from './korea-regions';

/** TourAPI sigungu under a KorService2 areaCode */
export interface Sigungu {
  sigunguCode: string;
  name: string;
  /** Approximate WGS84 center for location-based search */
  lat: number;
  lng: number;
}

/**
 * 시·군·구 목록 (여행 코스용 주요 권역).
 * TourAPI areaCode + sigunguCode. 행정통합 후에도 관광 API 코드는 기존 체계일 수 있음.
 */
export const SIGUNGU_BY_AREA: Record<string, Sigungu[]> = {
  // 서울
  '1': [
    { sigunguCode: '1', name: '강남구', lat: 37.5172, lng: 127.0473 },
    { sigunguCode: '2', name: '강동구', lat: 37.5301, lng: 127.1238 },
    { sigunguCode: '3', name: '강북구', lat: 37.6396, lng: 127.0257 },
    { sigunguCode: '4', name: '강서구', lat: 37.5509, lng: 126.8495 },
    { sigunguCode: '5', name: '관악구', lat: 37.4784, lng: 126.9516 },
    { sigunguCode: '6', name: '광진구', lat: 37.5384, lng: 127.0822 },
    { sigunguCode: '7', name: '구로구', lat: 37.4954, lng: 126.8874 },
    { sigunguCode: '8', name: '금천구', lat: 37.4563, lng: 126.895 },
    { sigunguCode: '9', name: '노원구', lat: 37.6542, lng: 127.0568 },
    { sigunguCode: '10', name: '도봉구', lat: 37.6688, lng: 127.0471 },
    { sigunguCode: '11', name: '동대문구', lat: 37.5744, lng: 127.0396 },
    { sigunguCode: '12', name: '동작구', lat: 37.5124, lng: 126.9393 },
    { sigunguCode: '13', name: '마포구', lat: 37.5663, lng: 126.9019 },
    { sigunguCode: '14', name: '서대문구', lat: 37.5791, lng: 126.9368 },
    { sigunguCode: '15', name: '서초구', lat: 37.4837, lng: 127.0324 },
    { sigunguCode: '16', name: '성동구', lat: 37.5633, lng: 127.0366 },
    { sigunguCode: '17', name: '성북구', lat: 37.5894, lng: 127.0167 },
    { sigunguCode: '18', name: '송파구', lat: 37.5145, lng: 127.105 },
    { sigunguCode: '19', name: '양천구', lat: 37.517, lng: 126.866 },
    { sigunguCode: '20', name: '영등포구', lat: 37.5264, lng: 126.896 },
    { sigunguCode: '21', name: '용산구', lat: 37.5326, lng: 126.990 },
    { sigunguCode: '22', name: '은평구', lat: 37.6027, lng: 126.9291 },
    { sigunguCode: '23', name: '종로구', lat: 37.5735, lng: 126.9788 },
    { sigunguCode: '24', name: '중구', lat: 37.5641, lng: 126.9979 },
    { sigunguCode: '25', name: '중랑구', lat: 37.6063, lng: 127.0925 },
  ],
  // 인천
  '2': [
    { sigunguCode: '1', name: '중구', lat: 37.4738, lng: 126.6216 },
    { sigunguCode: '2', name: '동구', lat: 37.4739, lng: 126.6432 },
    { sigunguCode: '3', name: '미추홀구', lat: 37.4635, lng: 126.650 },
    { sigunguCode: '4', name: '연수구', lat: 37.4101, lng: 126.6784 },
    { sigunguCode: '5', name: '남동구', lat: 37.4469, lng: 126.731 },
    { sigunguCode: '6', name: '부평구', lat: 37.507, lng: 126.7219 },
    { sigunguCode: '7', name: '계양구', lat: 37.537, lng: 126.737 },
    { sigunguCode: '8', name: '서구', lat: 37.545, lng: 126.676 },
    { sigunguCode: '9', name: '강화군', lat: 37.746, lng: 126.488 },
    { sigunguCode: '10', name: '옹진군', lat: 37.446, lng: 126.637 },
  ],
  // 대전
  '3': [
    { sigunguCode: '1', name: '동구', lat: 36.312, lng: 127.455 },
    { sigunguCode: '2', name: '중구', lat: 36.325, lng: 127.421 },
    { sigunguCode: '3', name: '서구', lat: 36.355, lng: 127.384 },
    { sigunguCode: '4', name: '유성구', lat: 36.362, lng: 127.356 },
    { sigunguCode: '5', name: '대덕구', lat: 36.347, lng: 127.416 },
  ],
  // 대구
  '4': [
    { sigunguCode: '1', name: '중구', lat: 35.869, lng: 128.606 },
    { sigunguCode: '2', name: '동구', lat: 35.886, lng: 128.635 },
    { sigunguCode: '3', name: '서구', lat: 35.872, lng: 128.559 },
    { sigunguCode: '4', name: '남구', lat: 35.846, lng: 128.597 },
    { sigunguCode: '5', name: '북구', lat: 35.886, lng: 128.583 },
    { sigunguCode: '6', name: '수성구', lat: 35.858, lng: 128.631 },
    { sigunguCode: '7', name: '달서구', lat: 35.83, lng: 128.535 },
    { sigunguCode: '8', name: '달성군', lat: 35.775, lng: 128.431 },
  ],
  // 광주
  '5': [
    { sigunguCode: '1', name: '동구', lat: 35.146, lng: 126.923 },
    { sigunguCode: '2', name: '서구', lat: 35.152, lng: 126.89 },
    { sigunguCode: '3', name: '남구', lat: 35.133, lng: 126.902 },
    { sigunguCode: '4', name: '북구', lat: 35.174, lng: 126.912 },
    { sigunguCode: '5', name: '광산구', lat: 35.14, lng: 126.794 },
  ],
  // 부산
  '6': [
    { sigunguCode: '1', name: '중구', lat: 35.106, lng: 129.032 },
    { sigunguCode: '2', name: '서구', lat: 35.098, lng: 129.024 },
    { sigunguCode: '3', name: '동구', lat: 35.129, lng: 129.045 },
    { sigunguCode: '4', name: '영도구', lat: 35.091, lng: 129.068 },
    { sigunguCode: '5', name: '부산진구', lat: 35.163, lng: 129.053 },
    { sigunguCode: '6', name: '동래구', lat: 35.205, lng: 129.078 },
    { sigunguCode: '7', name: '남구', lat: 35.136, lng: 129.084 },
    { sigunguCode: '8', name: '북구', lat: 35.197, lng: 128.99 },
    { sigunguCode: '9', name: '해운대구', lat: 35.163, lng: 129.164 },
    { sigunguCode: '10', name: '사하구', lat: 35.104, lng: 128.975 },
    { sigunguCode: '11', name: '금정구', lat: 35.243, lng: 129.092 },
    { sigunguCode: '12', name: '강서구', lat: 35.212, lng: 128.981 },
    { sigunguCode: '13', name: '연제구', lat: 35.176, lng: 129.08 },
    { sigunguCode: '14', name: '수영구', lat: 35.145, lng: 129.113 },
    { sigunguCode: '15', name: '사상구', lat: 35.153, lng: 128.991 },
    { sigunguCode: '16', name: '기장군', lat: 35.244, lng: 129.222 },
  ],
  // 울산
  '7': [
    { sigunguCode: '1', name: '중구', lat: 35.569, lng: 129.333 },
    { sigunguCode: '2', name: '남구', lat: 35.544, lng: 129.33 },
    { sigunguCode: '3', name: '동구', lat: 35.505, lng: 129.416 },
    { sigunguCode: '4', name: '북구', lat: 35.583, lng: 129.361 },
    { sigunguCode: '5', name: '울주군', lat: 35.522, lng: 129.242 },
  ],
  // 세종 — 단일 권역
  '8': [{ sigunguCode: '1', name: '세종시', lat: 36.48, lng: 127.289 }],
  // 경기
  '31': [
    { sigunguCode: '1', name: '수원시', lat: 37.2636, lng: 127.0286 },
    { sigunguCode: '2', name: '성남시', lat: 37.42, lng: 127.126 },
    { sigunguCode: '3', name: '의정부시', lat: 37.738, lng: 127.034 },
    { sigunguCode: '4', name: '안양시', lat: 37.394, lng: 126.957 },
    { sigunguCode: '5', name: '부천시', lat: 37.504, lng: 126.782 },
    { sigunguCode: '6', name: '광명시', lat: 37.479, lng: 126.865 },
    { sigunguCode: '7', name: '평택시', lat: 36.992, lng: 127.113 },
    { sigunguCode: '8', name: '동두천시', lat: 37.903, lng: 127.061 },
    { sigunguCode: '9', name: '안산시', lat: 37.322, lng: 126.831 },
    { sigunguCode: '10', name: '고양시', lat: 37.658, lng: 126.832 },
    { sigunguCode: '11', name: '과천시', lat: 37.429, lng: 126.988 },
    { sigunguCode: '12', name: '구리시', lat: 37.594, lng: 127.129 },
    { sigunguCode: '13', name: '남양주시', lat: 37.636, lng: 127.216 },
    { sigunguCode: '14', name: '오산시', lat: 37.15, lng: 127.077 },
    { sigunguCode: '15', name: '시흥시', lat: 37.38, lng: 126.803 },
    { sigunguCode: '16', name: '군포시', lat: 37.362, lng: 126.935 },
    { sigunguCode: '17', name: '의왕시', lat: 37.345, lng: 126.968 },
    { sigunguCode: '18', name: '하남시', lat: 37.539, lng: 127.215 },
    { sigunguCode: '19', name: '용인시', lat: 37.241, lng: 127.178 },
    { sigunguCode: '20', name: '파주시', lat: 37.76, lng: 126.78 },
    { sigunguCode: '21', name: '이천시', lat: 37.272, lng: 127.435 },
    { sigunguCode: '22', name: '안성시', lat: 37.008, lng: 127.28 },
    { sigunguCode: '23', name: '김포시', lat: 37.615, lng: 126.716 },
    { sigunguCode: '24', name: '화성시', lat: 37.2, lng: 126.831 },
    { sigunguCode: '25', name: '광주시', lat: 37.429, lng: 127.255 },
    { sigunguCode: '26', name: '양주시', lat: 37.785, lng: 127.046 },
    { sigunguCode: '27', name: '포천시', lat: 37.895, lng: 127.2 },
    { sigunguCode: '28', name: '여주시', lat: 37.298, lng: 127.637 },
    { sigunguCode: '29', name: '연천군', lat: 38.097, lng: 127.075 },
    { sigunguCode: '30', name: '가평군', lat: 37.831, lng: 127.51 },
    { sigunguCode: '31', name: '양평군', lat: 37.491, lng: 127.488 },
  ],
  // 강원
  '32': [
    { sigunguCode: '1', name: '춘천시', lat: 37.881, lng: 127.73 },
    { sigunguCode: '2', name: '원주시', lat: 37.342, lng: 127.92 },
    { sigunguCode: '3', name: '강릉시', lat: 37.752, lng: 128.876 },
    { sigunguCode: '4', name: '동해시', lat: 37.525, lng: 129.114 },
    { sigunguCode: '5', name: '태백시', lat: 37.164, lng: 128.986 },
    { sigunguCode: '6', name: '속초시', lat: 38.207, lng: 128.592 },
    { sigunguCode: '7', name: '삼척시', lat: 37.45, lng: 129.165 },
    { sigunguCode: '8', name: '홍천군', lat: 37.697, lng: 127.889 },
    { sigunguCode: '9', name: '횡성군', lat: 37.492, lng: 127.985 },
    { sigunguCode: '10', name: '영월군', lat: 37.184, lng: 128.462 },
    { sigunguCode: '11', name: '평창군', lat: 37.371, lng: 128.39 },
    { sigunguCode: '12', name: '정선군', lat: 37.381, lng: 128.661 },
    { sigunguCode: '13', name: '철원군', lat: 38.147, lng: 127.313 },
    { sigunguCode: '14', name: '화천군', lat: 38.106, lng: 127.708 },
    { sigunguCode: '15', name: '양구군', lat: 38.11, lng: 127.99 },
    { sigunguCode: '16', name: '인제군', lat: 38.07, lng: 128.17 },
    { sigunguCode: '17', name: '고성군', lat: 38.381, lng: 128.468 },
    { sigunguCode: '18', name: '양양군', lat: 38.075, lng: 128.619 },
  ],
  // 충북
  '33': [
    { sigunguCode: '1', name: '청주시', lat: 36.642, lng: 127.489 },
    { sigunguCode: '2', name: '충주시', lat: 36.991, lng: 127.926 },
    { sigunguCode: '3', name: '제천시', lat: 37.133, lng: 128.191 },
    { sigunguCode: '4', name: '보은군', lat: 36.49, lng: 127.729 },
    { sigunguCode: '5', name: '옥천군', lat: 36.306, lng: 127.571 },
    { sigunguCode: '6', name: '영동군', lat: 36.175, lng: 127.783 },
    { sigunguCode: '7', name: '증평군', lat: 36.785, lng: 127.581 },
    { sigunguCode: '8', name: '진천군', lat: 36.855, lng: 127.436 },
    { sigunguCode: '9', name: '괴산군', lat: 36.815, lng: 127.787 },
    { sigunguCode: '10', name: '음성군', lat: 36.94, lng: 127.69 },
    { sigunguCode: '11', name: '단양군', lat: 36.984, lng: 128.366 },
  ],
  // 충남
  '34': [
    { sigunguCode: '1', name: '천안시', lat: 36.815, lng: 127.114 },
    { sigunguCode: '2', name: '공주시', lat: 36.447, lng: 127.119 },
    { sigunguCode: '3', name: '보령시', lat: 36.333, lng: 126.613 },
    { sigunguCode: '4', name: '아산시', lat: 36.79, lng: 127.002 },
    { sigunguCode: '5', name: '서산시', lat: 36.785, lng: 126.45 },
    { sigunguCode: '6', name: '논산시', lat: 36.187, lng: 127.099 },
    { sigunguCode: '7', name: '계룡시', lat: 36.274, lng: 127.249 },
    { sigunguCode: '8', name: '당진시', lat: 36.89, lng: 126.646 },
    { sigunguCode: '9', name: '금산군', lat: 36.109, lng: 127.488 },
    { sigunguCode: '10', name: '부여군', lat: 36.276, lng: 126.91 },
    { sigunguCode: '11', name: '서천군', lat: 36.08, lng: 126.692 },
    { sigunguCode: '12', name: '청양군', lat: 36.459, lng: 126.802 },
    { sigunguCode: '13', name: '홍성군', lat: 36.601, lng: 126.661 },
    { sigunguCode: '14', name: '예산군', lat: 36.682, lng: 126.849 },
    { sigunguCode: '15', name: '태안군', lat: 36.745, lng: 126.298 },
  ],
  // 경북
  '35': [
    { sigunguCode: '1', name: '포항시', lat: 36.019, lng: 129.344 },
    { sigunguCode: '2', name: '경주시', lat: 35.856, lng: 129.225 },
    { sigunguCode: '3', name: '김천시', lat: 36.14, lng: 128.114 },
    { sigunguCode: '4', name: '안동시', lat: 36.568, lng: 128.729 },
    { sigunguCode: '5', name: '구미시', lat: 36.119, lng: 128.344 },
    { sigunguCode: '6', name: '영주시', lat: 36.806, lng: 128.624 },
    { sigunguCode: '7', name: '영천시', lat: 35.973, lng: 128.939 },
    { sigunguCode: '8', name: '상주시', lat: 36.411, lng: 128.159 },
    { sigunguCode: '9', name: '문경시', lat: 36.587, lng: 128.187 },
    { sigunguCode: '10', name: '경산시', lat: 35.825, lng: 128.741 },
    { sigunguCode: '11', name: '군위군', lat: 36.243, lng: 128.573 },
    { sigunguCode: '12', name: '의성군', lat: 36.353, lng: 128.697 },
    { sigunguCode: '13', name: '청송군', lat: 36.436, lng: 129.057 },
    { sigunguCode: '14', name: '영양군', lat: 36.667, lng: 129.112 },
    { sigunguCode: '15', name: '영덕군', lat: 36.415, lng: 129.366 },
    { sigunguCode: '16', name: '청도군', lat: 35.647, lng: 128.734 },
    { sigunguCode: '17', name: '고령군', lat: 35.726, lng: 128.263 },
    { sigunguCode: '18', name: '성주군', lat: 35.919, lng: 128.283 },
    { sigunguCode: '19', name: '칠곡군', lat: 35.995, lng: 128.402 },
    { sigunguCode: '20', name: '예천군', lat: 36.658, lng: 128.453 },
    { sigunguCode: '21', name: '봉화군', lat: 36.893, lng: 128.733 },
    { sigunguCode: '22', name: '울진군', lat: 36.993, lng: 129.4 },
    { sigunguCode: '23', name: '울릉군', lat: 37.484, lng: 130.905 },
  ],
  // 경남
  '36': [
    { sigunguCode: '1', name: '창원시', lat: 35.228, lng: 128.681 },
    { sigunguCode: '2', name: '진주시', lat: 35.18, lng: 128.108 },
    { sigunguCode: '3', name: '통영시', lat: 34.854, lng: 128.433 },
    { sigunguCode: '4', name: '사천시', lat: 35.004, lng: 128.064 },
    { sigunguCode: '5', name: '김해시', lat: 35.229, lng: 128.889 },
    { sigunguCode: '6', name: '밀양시', lat: 35.504, lng: 128.747 },
    { sigunguCode: '7', name: '거제시', lat: 34.88, lng: 128.621 },
    { sigunguCode: '8', name: '양산시', lat: 35.335, lng: 129.037 },
    { sigunguCode: '9', name: '의령군', lat: 35.322, lng: 128.262 },
    { sigunguCode: '10', name: '함안군', lat: 35.272, lng: 128.406 },
    { sigunguCode: '11', name: '창녕군', lat: 35.544, lng: 128.5 },
    { sigunguCode: '12', name: '고성군', lat: 34.973, lng: 128.324 },
    { sigunguCode: '13', name: '남해군', lat: 34.838, lng: 127.892 },
    { sigunguCode: '14', name: '하동군', lat: 35.067, lng: 127.751 },
    { sigunguCode: '15', name: '산청군', lat: 35.415, lng: 127.873 },
    { sigunguCode: '16', name: '함양군', lat: 35.52, lng: 127.725 },
    { sigunguCode: '17', name: '거창군', lat: 35.687, lng: 127.909 },
    { sigunguCode: '18', name: '합천군', lat: 35.567, lng: 128.166 },
  ],
  // 전북
  '37': [
    { sigunguCode: '1', name: '전주시', lat: 35.824, lng: 127.148 },
    { sigunguCode: '2', name: '군산시', lat: 35.968, lng: 126.737 },
    { sigunguCode: '3', name: '익산시', lat: 35.948, lng: 126.958 },
    { sigunguCode: '4', name: '정읍시', lat: 35.57, lng: 126.856 },
    { sigunguCode: '5', name: '남원시', lat: 35.416, lng: 127.39 },
    { sigunguCode: '6', name: '김제시', lat: 35.803, lng: 126.881 },
    { sigunguCode: '7', name: '완주군', lat: 35.905, lng: 127.162 },
    { sigunguCode: '8', name: '진안군', lat: 35.792, lng: 127.425 },
    { sigunguCode: '9', name: '무주군', lat: 36.007, lng: 127.661 },
    { sigunguCode: '10', name: '장수군', lat: 35.647, lng: 127.521 },
    { sigunguCode: '11', name: '임실군', lat: 35.613, lng: 127.279 },
    { sigunguCode: '12', name: '순창군', lat: 35.374, lng: 127.137 },
    { sigunguCode: '13', name: '고창군', lat: 35.435, lng: 126.702 },
    { sigunguCode: '14', name: '부안군', lat: 35.732, lng: 126.733 },
  ],
  // 전남 (TourAPI areaCode 38 — 행정통합과 별개로 API 코드 유지 가능)
  '38': [
    { sigunguCode: '1', name: '목포시', lat: 34.812, lng: 126.392 },
    { sigunguCode: '2', name: '여수시', lat: 34.76, lng: 127.662 },
    { sigunguCode: '3', name: '순천시', lat: 34.951, lng: 127.487 },
    { sigunguCode: '4', name: '나주시', lat: 35.016, lng: 126.711 },
    { sigunguCode: '5', name: '광양시', lat: 34.941, lng: 127.696 },
    { sigunguCode: '6', name: '담양군', lat: 35.321, lng: 126.988 },
    { sigunguCode: '7', name: '곡성군', lat: 35.282, lng: 127.292 },
    { sigunguCode: '8', name: '구례군', lat: 35.202, lng: 127.463 },
    { sigunguCode: '9', name: '고흥군', lat: 34.611, lng: 127.285 },
    { sigunguCode: '10', name: '보성군', lat: 34.771, lng: 127.08 },
    { sigunguCode: '11', name: '화순군', lat: 35.064, lng: 126.987 },
    { sigunguCode: '12', name: '장흥군', lat: 34.682, lng: 126.907 },
    { sigunguCode: '13', name: '강진군', lat: 34.642, lng: 126.767 },
    { sigunguCode: '14', name: '해남군', lat: 34.573, lng: 126.599 },
    { sigunguCode: '15', name: '영암군', lat: 34.8, lng: 126.697 },
    { sigunguCode: '16', name: '무안군', lat: 34.99, lng: 126.482 },
    { sigunguCode: '17', name: '함평군', lat: 35.066, lng: 126.517 },
    { sigunguCode: '18', name: '영광군', lat: 35.277, lng: 126.512 },
    { sigunguCode: '19', name: '장성군', lat: 35.302, lng: 126.785 },
    { sigunguCode: '20', name: '완도군', lat: 34.312, lng: 126.755 },
    { sigunguCode: '21', name: '진도군', lat: 34.487, lng: 126.263 },
    { sigunguCode: '22', name: '신안군', lat: 34.79, lng: 126.1 },
  ],
  // 제주
  '39': [
    { sigunguCode: '1', name: '제주시', lat: 33.4996, lng: 126.5312 },
    { sigunguCode: '2', name: '서귀포시', lat: 33.2541, lng: 126.560 },
  ],
};

export function getSigunguList(areaCode: string): Sigungu[] {
  return SIGUNGU_BY_AREA[areaCode] ?? [];
}

export function getSigungu(
  areaCode: string,
  sigunguCode: string
): Sigungu | undefined {
  return getSigunguList(areaCode).find((s) => s.sigunguCode === sigunguCode);
}

export function formatDestinationName(
  region: KoreaRegion,
  sigungu?: Sigungu | null
): string {
  if (!sigungu) {
    return region.group === 'metropolitan'
      ? `${region.shortName} 전체`
      : region.name;
  }
  // 세종시처럼 시 이름이 도에 포함되면 중복 방지
  if (region.shortName === '세종') return sigungu.name;
  return `${region.shortName} ${sigungu.name}`;
}

/** Resolve search center: sigungu first, else sido center */
export function getDestinationCoords(
  areaCode: string,
  sigunguCode?: string | null
): { lat: number; lng: number } {
  if (sigunguCode) {
    const s = getSigungu(areaCode, sigunguCode);
    if (s) return { lat: s.lat, lng: s.lng };
  }
  const region = getRegionByAreaCode(areaCode);
  return { lat: region.lat, lng: region.lng };
}

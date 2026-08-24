/* E9-Bridge — 지식베이스 (RAG-lite)
   ------------------------------------------------------------------
   · NOTICES : 최신 제도 페이지에 올라가는 제도 요약.
   · KB      : 질문 답변 엔진이 참고하는 유일한 근거 묶음.
               keywords 는 언어를 가리지 않고 한 배열에 모아 둡니다.
   · 답변은 반드시 src(근거)를 함께 가집니다. 근거가 없으면 답하지 않습니다.
   · review:true 인 항목은 답변 위에 "실무자 검수" 표시가 붙습니다.
   ------------------------------------------------------------------

   ■ 제도 제목(title) 쓰는 규칙 — 새 제도를 추가할 때도 지켜 주세요

   제목은 목록에서 훑어보는 자리입니다. 문장이 아니라 **명사형 한 덩어리**로
   짧게 씁니다. 자세한 설명은 아래 points 에 넣으면 됩니다.

     ○ 비수도권 제조업 고용 한도 확대
     ✗ 비수도권 제조업의 고용 한도가 늘었습니다

     ○ 2026년 최저임금 시급 10,320원
     ✗ 2026년 최저임금은 시간당 10,320원입니다

   · "~합니다 / ~됩니다 / ~입니다" 같은 서술어로 끝내지 않습니다.
   · 무엇이 어떻게 바뀌었는지가 드러나게 씁니다 (확대 · 축소 · 강화 · 추가 · 논의 중).
   · 숫자가 핵심이면 제목에 넣습니다.
   · 다섯 언어 모두 같은 방식으로 짧게 씁니다. 번역투로 늘어지지 않게 하세요.
   ------------------------------------------------------------------ */

const NOTICES = [
  {
    key: 'n-kz-2026',
    tagKey: 'eps',
    source: '외국인력정책위원회 · 고용노동부',
    url: 'https://www.moel.go.kr',
    date: '2026-08-14',
    checked: '2026-08-23',
    ko: { title: '카자흐스탄 송출국 추가',
      points: [
        '제49차 외국인력정책위원회에서 카자흐스탄을 새 송출국으로 지정했습니다.',
        '이로써 E-9 송출국은 17개국에서 18개국으로 늘어납니다.',
        '중앙아시아에서는 우즈베키스탄·키르기스스탄·타지키스탄에 이어 네 번째입니다.'
      ] },
    en: { title: 'Kazakhstan added as sending country',
      points: [
        'The 49th Foreign Workforce Policy Committee designated Kazakhstan as a new sending country.',
        'The number of E-9 sending countries rises from 17 to 18.',
        'It is the fourth in Central Asia, after Uzbekistan, Kyrgyzstan and Tajikistan.'
      ] },
    vi: { title: 'Bổ sung Kazakhstan làm nước phái cử',
      points: [
        'Ủy ban Chính sách Nhân lực Nước ngoài lần thứ 49 đã chỉ định Kazakhstan là nước phái cử mới.',
        'Số nước phái cử E-9 tăng từ 17 lên 18.',
        'Đây là nước thứ tư ở Trung Á, sau Uzbekistan, Kyrgyzstan và Tajikistan.'
      ] },
    th: { title: 'เพิ่มคาซัคสถานเป็นประเทศส่งแรงงาน',
      points: [
        'คณะกรรมการนโยบายแรงงานต่างชาติครั้งที่ 49 กำหนดให้คาซัคสถานเป็นประเทศส่งแรงงานใหม่',
        'ทำให้จำนวนประเทศส่งแรงงาน E-9 เพิ่มจาก 17 เป็น 18 ประเทศ',
        'เป็นประเทศที่สี่ในเอเชียกลาง ต่อจากอุซเบกิสถาน คีร์กีซสถาน และทาจิกิสถาน'
      ] },
    id: { title: 'Penambahan Kazakhstan sebagai negara pengirim',
      points: [
        'Komite Kebijakan Tenaga Kerja Asing ke-49 menetapkan Kazakhstan sebagai negara pengirim baru.',
        'Jumlah negara pengirim E-9 bertambah dari 17 menjadi 18.',
        'Ini negara keempat di Asia Tengah, setelah Uzbekistan, Kirgistan, dan Tajikistan.'
      ] }
  },
  {
    key: 'n-control-2026',
    tagKey: 'eps',
    source: '고용노동부 · 언론 보도',
    url: 'https://www.moel.go.kr',
    date: '2026-08-14',
    checked: '2026-08-23',
    ko: { title: '체류·사업장 관리 강화',
      points: [
        'E-9으로 들어온 근로자의 체류와 사업장 관리가 한층 엄격해졌습니다.',
        '무단 이탈과 불법체류 단속이 늘어납니다.',
        '허락 없이 근무처를 벗어나면 불이익이 커집니다. 사업장을 옮길 때는 반드시 고용센터를 거치세요.'
      ] },
    en: { title: 'Stay and workplace controls tightened',
      points: [
        'Management of stay and workplaces for E-9 workers has become stricter.',
        'Crackdowns on leaving without permission and on overstaying are increasing.',
        'Leaving your workplace without approval now carries heavier consequences. Always go through the Employment Center to move.'
      ] },
    vi: { title: 'Siết chặt quản lý cư trú và nơi làm việc',
      points: [
        'Việc quản lý cư trú và nơi làm việc đối với lao động E-9 đã chặt chẽ hơn.',
        'Việc kiểm tra tình trạng tự ý bỏ việc và cư trú bất hợp pháp tăng lên.',
        'Rời nơi làm việc khi chưa được phép sẽ chịu bất lợi lớn hơn. Khi chuyển nơi làm việc hãy luôn qua Trung tâm việc làm.'
      ] },
    th: { title: 'เข้มงวดการจัดการพำนักและสถานประกอบการ',
      points: [
        'การจัดการการพำนักและสถานประกอบการของแรงงาน E-9 เข้มงวดมากขึ้น',
        'การตรวจจับการหนีงานและการพำนักเกินกำหนดเพิ่มขึ้น',
        'การออกจากสถานประกอบการโดยไม่ได้รับอนุญาตจะมีผลเสียมากขึ้น เมื่อจะย้ายงานต้องผ่านศูนย์จัดหางานเสมอ'
      ] },
    id: { title: 'Pengetatan izin tinggal dan tempat kerja',
      points: [
        'Pengelolaan izin tinggal dan tempat kerja bagi pekerja E-9 menjadi lebih ketat.',
        'Razia terhadap kaburnya pekerja dan tinggal melebihi izin meningkat.',
        'Meninggalkan tempat kerja tanpa izin kini berakibat lebih berat. Selalu lewat Pusat Ketenagakerjaan saat pindah.'
      ] }
  },
  {
    key: 'n-minwage-2026',
    tagKey: 'eps',
    source: '고용노동부 고시 · 최저임금위원회',
    url: 'https://www.moel.go.kr',
    date: '2026-01-01',
    checked: '2026-08-23',
    ko: { title: '2026년 최저임금 시급 10,320원',
      points: [
        '2026년 1월 1일부터 12월 31일까지 시간급 10,320원이 적용됩니다.',
        '주 40시간·월 209시간 기준 월 환산액은 2,156,880원입니다.',
        '업종 구분 없이 모든 사업장에 같게 적용되며, 외국인도 한국인과 똑같이 적용받습니다.',
        '이보다 적게 받고 있다면 임금 체불입니다. 고용노동부 1350으로 상담하세요.'
      ] },
    en: { title: '2026 minimum wage: 10,320 KRW per hour',
      points: [
        'From 1 January to 31 December 2026 the hourly minimum wage is 10,320 KRW.',
        'Converted to a month at 40 hours a week and 209 hours a month, that is 2,156,880 KRW.',
        'It applies equally to every workplace regardless of industry, and to foreign workers exactly as to Korean workers.',
        'If you are paid less than this, it is unpaid wages. Call the Ministry of Employment and Labor on 1350.'
      ] },
    vi: { title: 'Lương tối thiểu 2026: 10.320 won/giờ',
      points: [
        'Từ ngày 1/1 đến 31/12/2026, lương tối thiểu theo giờ là 10.320 won.',
        'Quy đổi theo tháng với 40 giờ/tuần và 209 giờ/tháng là 2.156.880 won.',
        'Áp dụng như nhau cho mọi nơi làm việc, không phân biệt ngành, và cho người nước ngoài giống hệt người Hàn Quốc.',
        'Nếu bạn nhận ít hơn mức này thì đó là nợ lương. Hãy gọi Bộ Việc làm và Lao động số 1350.'
      ] },
    th: { title: 'ค่าจ้างขั้นต่ำ 2026: 10,320 วอน/ชั่วโมง',
      points: [
        'ตั้งแต่ 1 มกราคม ถึง 31 ธันวาคม 2026 ค่าจ้างขั้นต่ำรายชั่วโมงคือ 10,320 วอน',
        'คำนวณเป็นรายเดือนที่ 40 ชั่วโมงต่อสัปดาห์ และ 209 ชั่วโมงต่อเดือน เท่ากับ 2,156,880 วอน',
        'ใช้เท่ากันทุกสถานประกอบการโดยไม่แบ่งประเภทกิจการ และใช้กับชาวต่างชาติเช่นเดียวกับคนเกาหลี',
        'หากได้รับน้อยกว่านี้ถือเป็นการค้างจ่ายค่าจ้าง โทรปรึกษากระทรวงแรงงานที่ 1350'
      ] },
    id: { title: 'Upah minimum 2026: 10.320 won/jam',
      points: [
        'Mulai 1 Januari sampai 31 Desember 2026 upah minimum per jam adalah 10.320 won.',
        'Dikonversi per bulan dengan 40 jam seminggu dan 209 jam sebulan menjadi 2.156.880 won.',
        'Berlaku sama untuk semua tempat kerja tanpa membedakan sektor, dan bagi pekerja asing sama seperti pekerja Korea.',
        'Jika Anda dibayar kurang dari ini, itu tunggakan upah. Hubungi Kementerian Ketenagakerjaan di 1350.'
      ] }
  },
  {
    key: 'n-quota-2026',
    tagKey: 'eps',
    source: '외국인력정책위원회 · 고용노동부',
    url: 'https://www.moel.go.kr',
    date: '2025-12-22',
    checked: '2026-08-23',
    ko: { title: '2026년 신규 도입 인원 축소 (8만 명)',
      points: [
        '2026년 고용허가제(E-9) 쿼터가 8만 명으로 정해졌습니다.',
        '2025년 13만 명에서 약 38% 줄어든 규모입니다.',
        '새로 들어오는 사람이 줄어드는 대신, 이미 한국에 있는 사람의 자리를 두고 경쟁이 커질 수 있습니다.',
        '사업장을 옮길 계획이라면 구직 기간 3개월을 더 넉넉히 잡고 준비하세요.'
      ] },
    en: { title: '2026 intake cut to 80,000',
      points: [
        'The 2026 Employment Permit System (E-9) quota is set at 80,000 people.',
        'That is about 38% lower than the 130,000 of 2025.',
        'Fewer new arrivals may mean more competition for places among those already in Korea.',
        'If you plan to change workplace, prepare early — the 3-month job-search period may feel tighter.'
      ] },
    vi: { title: 'Chỉ tiêu 2026 giảm còn 80.000 người',
      points: [
        'Chỉ tiêu Chương trình cấp phép việc làm (E-9) năm 2026 được ấn định là 80.000 người.',
        'Con số này thấp hơn khoảng 38% so với 130.000 của năm 2025.',
        'Người mới nhập cảnh ít đi có thể khiến cạnh tranh giữa những người đã ở Hàn Quốc tăng lên.',
        'Nếu định đổi nơi làm việc, hãy chuẩn bị sớm — 3 tháng tìm việc có thể trở nên eo hẹp hơn.'
      ] },
    th: { title: 'โควตาปี 2026 ลดเหลือ 80,000 คน',
      points: [
        'โควตาระบบอนุญาตจ้างงาน (E-9) ปี 2026 กำหนดไว้ที่ 80,000 คน',
        'ลดลงประมาณ 38% จาก 130,000 คนในปี 2025',
        'ผู้เข้ามาใหม่น้อยลงอาจทำให้การแข่งขันในหมู่คนที่อยู่ในเกาหลีแล้วสูงขึ้น',
        'หากวางแผนย้ายที่ทำงาน ควรเตรียมตัวแต่เนิ่น ๆ เพราะ 3 เดือนหางานอาจรู้สึกกระชั้นขึ้น'
      ] },
    id: { title: 'Kuota 2026 turun jadi 80.000',
      points: [
        'Kuota Sistem Izin Kerja (E-9) tahun 2026 ditetapkan 80.000 orang.',
        'Angka itu sekitar 38% lebih rendah dari 130.000 pada 2025.',
        'Pendatang baru yang lebih sedikit dapat meningkatkan persaingan di antara yang sudah di Korea.',
        'Jika berencana pindah tempat kerja, bersiaplah lebih awal — masa 3 bulan mencari kerja bisa terasa lebih sempit.'
      ] }
  },
  {
    key: 'n-nonmetro-2026',
    tagKey: 'eps',
    source: '외국인력정책위원회 · 고용노동부',
    url: 'https://www.moel.go.kr',
    date: '2025-12-22',
    checked: '2026-08-23',
    ko: { title: '비수도권 제조업 고용 한도 확대',
      points: [
        '비수도권 제조업체가 외국인을 추가로 고용할 수 있는 한도가 내국인 대비 20%에서 30%로 올랐습니다.',
        '비수도권 유턴기업은 규모와 상관없이 외국인 고용이 가능해지고, 추가 고용 상한 50명도 없어집니다.',
        '수도권 밖에서 일자리를 찾는다면 선택지가 조금 넓어질 수 있습니다.'
      ] },
    en: { title: 'Higher hiring limits outside the capital area',
      points: [
        'Manufacturers outside the capital region may now hire foreign workers up to 30% of their Korean workforce, up from 20%.',
        'Returning companies outside the capital area can hire regardless of size, and the extra cap of 50 workers is removed.',
        'If you are looking for work outside the capital region, there may be a few more options.'
      ] },
    vi: { title: 'Nâng hạn mức tuyển dụng ngoài vùng thủ đô',
      points: [
        'Doanh nghiệp sản xuất ngoài vùng thủ đô nay được tuyển lao động nước ngoài tới 30% so với lao động Hàn Quốc, tăng từ 20%.',
        'Doanh nghiệp hồi hương ngoài vùng thủ đô được tuyển bất kể quy mô, và trần bổ sung 50 người bị bãi bỏ.',
        'Nếu bạn tìm việc ngoài vùng thủ đô, lựa chọn có thể rộng hơn một chút.'
      ] },
    th: { title: 'เพิ่มเพดานจ้างงานนอกเขตเมืองหลวง',
      points: [
        'โรงงานนอกเขตเมืองหลวงจ้างแรงงานต่างชาติเพิ่มได้ถึง 30% เทียบกับแรงงานเกาหลี จากเดิม 20%',
        'บริษัทที่ย้ายฐานกลับมาซึ่งตั้งอยู่นอกเขตเมืองหลวงจ้างได้โดยไม่จำกัดขนาดกิจการ และยกเลิกเพดานเพิ่มเติม 50 คน',
        'หากคุณหางานนอกเขตเมืองหลวง ตัวเลือกอาจกว้างขึ้นเล็กน้อย'
      ] },
    id: { title: 'Kenaikan batas perekrutan di luar ibu kota',
      points: [
        'Pabrik di luar wilayah ibu kota kini boleh mempekerjakan pekerja asing hingga 30% dari pekerja Korea, naik dari 20%.',
        'Perusahaan yang kembali dan berlokasi di luar ibu kota bisa merekrut tanpa memandang ukuran, dan batas tambahan 50 orang dihapus.',
        'Jika Anda mencari kerja di luar wilayah ibu kota, pilihannya mungkin sedikit lebih luas.'
      ] }
  },
  {
    key: 'n-longstay-2026',
    tagKey: 'eps',
    source: '외국인력정책위원회 발표 · 언론 보도',
    url: 'https://www.moel.go.kr',
    date: '2026-08-03',
    checked: '2026-08-23',
    ko: { title: '10년 이상 장기 체류 방안 논의 중',
      points: [
        'E-9 근로자의 장기 체류를 넓히는 방안이 논의 중이라고 알려졌습니다.',
        '아직 확정된 제도가 아니므로, 지금의 체류 기간(최장 4년 10개월)을 기준으로 계획하세요.',
        '확정되면 이 쪽에 다시 올리겠습니다. 소문만 듣고 움직이지 마세요.'
      ] },
    en: { title: '10-year stay scheme under discussion',
      points: [
        'Ways to extend long-term stay for E-9 workers are reported to be under discussion.',
        'Nothing is decided yet, so plan around the current limit of 4 years and 10 months.',
        'We will post here once it is confirmed. Do not act on rumours alone.'
      ] },
    vi: { title: 'Đang thảo luận cư trú dài hạn 10 năm',
      points: [
        'Có thông tin rằng các phương án mở rộng cư trú dài hạn cho lao động E-9 đang được thảo luận.',
        'Chưa có gì được quyết định, vì vậy hãy lên kế hoạch theo thời hạn hiện tại là 4 năm 10 tháng.',
        'Chúng tôi sẽ đăng lại ở đây khi có quyết định. Đừng hành động chỉ vì tin đồn.'
      ] },
    th: { title: 'หารือแนวทางพำนักระยะยาว 10 ปี',
      points: [
        'มีรายงานว่ากำลังหารือแนวทางขยายการพำนักระยะยาวสำหรับแรงงาน E-9',
        'ยังไม่มีข้อสรุป จึงควรวางแผนตามกำหนดปัจจุบันคือ 4 ปี 10 เดือน',
        'เมื่อมีการยืนยันจะนำมาลงที่นี่อีกครั้ง อย่าตัดสินใจจากข่าวลือเพียงอย่างเดียว'
      ] },
    id: { title: 'Pembahasan tinggal panjang 10 tahun',
      points: [
        'Dikabarkan sedang dibahas cara memperluas masa tinggal panjang bagi pekerja E-9.',
        'Belum ada keputusan, jadi rencanakan berdasarkan batas saat ini yaitu 4 tahun 10 bulan.',
        'Kami akan memuatnya di sini bila sudah dipastikan. Jangan bertindak hanya berdasarkan desas-desus.'
      ] }
  }
];

/* ---------------- 인터뷰 ----------------

   실제로 사업장을 옮겨 본 사람의 이야기와, 이 사이트를 써 본 소감을 담습니다.

   ■ 지금은 비어 있습니다.
     인터뷰를 하기 전에는 아무것도 넣지 마세요. 지어낸 사람 이야기를 올리면
     읽는 사람이 그 경험을 근거로 자기 일을 결정합니다. 빈 화면이 가짜보다 낫습니다.
     비어 있으면 화면에 "인터뷰를 준비하고 있습니다" 안내만 나옵니다.

   ■ 올리기 전에 반드시 지울 것
     이름 · 회사명 · 공장 이름 · 정확한 지역 · 입국 연도.
     이 다섯 가지 중 두세 개만 겹쳐도 사업주는 누구인지 알아냅니다.
     "경기 남부 금속 공장" 정도로 뭉뚱그리고, 이름은 가명을 쓰세요.
     본인 동의를 받았더라도 마찬가지입니다 — 동의한 사람은 자기가 특정될
     위험을 다 알기 어렵습니다.

   ■ 항목 하나 예시 (실제 인터뷰를 하고 나서 이 모양으로 채우세요)

   {
     key: 'itv-01',
     alias: 'A',                    // 가명 또는 이니셜
     country: 'vi',                 // 국적 — 국기·라벨 표시에 씁니다
     years: 3,                      // 한국에서 일한 햇수
     field: 'metal',                // 업종 (자세한 회사명 대신)
     date: '2026-09-01',            // 인터뷰한 날
     ko: {
       intro: '한 줄 소개',
       qa: [
         { q: '사업장을 옮길 때 가장 힘들었던 것은?', a: '...' },
         { q: '이 사이트가 도움이 됐나요?',           a: '...' }
       ],
       useQuote: '이 사이트를 쓴 소감 한 줄 (선택)'   // 있으면 인터뷰 카드 맨 아래에 인용문으로 이어 붙습니다.
                                                       // 예전에는 이걸 모아 "이 사이트를 써 본 사람들"이라는
                                                       // 별도 섹션에 따로 보였지만, 지금은 그 섹션 없이
                                                       // 각 인터뷰 카드 안에 바로 싣습니다.
     },
     en: { ... }, vi: { ... }, th: { ... }, id: { ... }
   }
   ------------------------------------------------------------------ */

const INTERVIEWS = [];

/* ---------------- 질문 답변 지식베이스 ---------------- */

const KB = [
  {
    key: 'apply-deadline',
    keywords: ['기한','신청','1개월','한달','마감','며칠','deadline','apply','month','days','hạn','nộp đơn','bao nhiêu ngày','กี่วัน','ยื่น','กำหนด','berapa hari','mengajukan','batas'],
    src: '외국인근로자의 고용 등에 관한 법률 제25조 · 확인일 2026-08-10',
    ko: '근로계약이 끝난 날부터 1개월 안에 고용센터에 사업장 변경을 신청해야 합니다. 신청한 날짜가 그 다음 3개월 구직 기간의 시작점이 되므로, 접수증을 꼭 받아 두세요.',
    en: 'You have 1 month from the end of your contract to apply at the Employment Center. The date you apply starts the following 3-month job-search period, so keep your receipt.',
    vi: 'Bạn có 1 tháng kể từ ngày hợp đồng kết thúc để nộp đơn tại Trung tâm việc làm. Ngày nộp đơn là mốc bắt đầu của 3 tháng tìm việc, nên hãy giữ giấy tiếp nhận.',
    th: 'คุณมีเวลา 1 เดือนนับจากวันสิ้นสุดสัญญาเพื่อยื่นคำขอที่ศูนย์จัดหางาน วันที่ยื่นคือจุดเริ่มต้นของช่วง 3 เดือนสำหรับหางาน จึงควรเก็บใบรับคำขอไว้',
    id: 'Anda punya 1 bulan sejak kontrak berakhir untuk mengajukan di Pusat Ketenagakerjaan. Tanggal pengajuan menjadi awal masa 3 bulan mencari kerja, jadi simpan tanda terimanya.'
  },
  {
    key: 'job-period',
    keywords: ['3개월','구직','못 구하면','출국','취업','기간','three months','3 months','job','find','leave the country','deport','3 tháng','tìm việc','xuất cảnh','không tìm được','3 เดือน','หางาน','ออกนอกประเทศ','3 bulan','cari kerja','keluar','tidak dapat'],
    src: '외국인근로자의 고용 등에 관한 법률 제25조 제3항 · 확인일 2026-08-10',
    ko: '사업장 변경을 신청한 날부터 3개월 안에 새 근무처를 정하고 허가를 받아야 하며, 그렇지 못하면 원칙적으로 출국해야 합니다. 병이나 사고처럼 본인 책임이 아닌 사정이 있으면 그 기간을 빼 달라고 요청할 수 있고, 증빙 서류가 필요합니다.',
    en: 'From the day you apply you have 3 months to secure a new workplace and get approval; otherwise you must in principle leave Korea. If illness or an accident made this impossible, you can request that the period be excluded, with documents to prove it.',
    vi: 'Kể từ ngày nộp đơn, bạn có 3 tháng để tìm nơi làm việc mới và được cấp phép; nếu không, về nguyên tắc bạn phải xuất cảnh. Nếu do bệnh tật hay tai nạn ngoài ý muốn, bạn có thể xin trừ thời gian đó kèm giấy tờ chứng minh.',
    th: 'นับจากวันยื่นคำขอ คุณมีเวลา 3 เดือนในการหาที่ทำงานใหม่และได้รับอนุญาต มิฉะนั้นโดยหลักการต้องเดินทางออกนอกประเทศ หากเป็นเพราะเจ็บป่วยหรืออุบัติเหตุที่ไม่ใช่ความผิดของคุณ สามารถขอหักช่วงเวลานั้นได้โดยต้องมีเอกสารยืนยัน',
    id: 'Sejak tanggal pengajuan Anda punya 3 bulan untuk mendapatkan tempat kerja baru dan izinnya; bila tidak, pada dasarnya Anda harus keluar dari Korea. Bila sakit atau kecelakaan membuatnya mustahil, Anda bisa meminta periode itu dikecualikan dengan dokumen pendukung.'
  },
  {
    key: 'limit-count',
    keywords: ['횟수','몇 번','3회','2회','제한','재고용','how many','times','limit','change','mấy lần','số lần','giới hạn','กี่ครั้ง','จำนวนครั้ง','จำกัด','berapa kali','jumlah','batas pindah'],
    src: '외국인근로자의 고용 등에 관한 법률 제25조 제4항 · 확인일 2026-08-10',
    ko: '원칙적으로 최초 3년의 취업활동 기간에는 3회까지, 재고용으로 연장된 기간에는 2회까지 사업장을 바꿀 수 있습니다. 임금체불이나 부당한 대우처럼 근로자 책임이 아닌 사유로 옮긴 경우는 이 횟수에 넣지 않습니다.',
    en: 'As a rule you may change workplaces up to 3 times during the first 3-year work period, and up to 2 more times during a re-employment extension. Changes caused by reasons that are not the worker’s fault — unpaid wages, unfair treatment — are not counted.',
    vi: 'Về nguyên tắc, bạn được đổi nơi làm việc tối đa 3 lần trong 3 năm đầu và thêm 2 lần trong thời gian gia hạn tái tuyển dụng. Những lần đổi vì lý do không phải lỗi của người lao động, như nợ lương hay đối xử bất công, thì không bị tính.',
    th: 'โดยหลักการ คุณเปลี่ยนสถานประกอบการได้ไม่เกิน 3 ครั้งในช่วง 3 ปีแรก และไม่เกิน 2 ครั้งในช่วงที่ต่ออายุการจ้างใหม่ การเปลี่ยนเพราะเหตุที่ไม่ใช่ความผิดของลูกจ้าง เช่น ค้างจ่ายค่าจ้างหรือการปฏิบัติที่ไม่เป็นธรรม จะไม่ถูกนับ',
    id: 'Pada dasarnya Anda boleh pindah tempat kerja sampai 3 kali selama masa kerja 3 tahun pertama, dan sampai 2 kali lagi pada masa perpanjangan. Perpindahan karena alasan yang bukan kesalahan pekerja — upah tertunggak, perlakuan tidak adil — tidak dihitung.'
  },
  {
    key: 'reasons',
    keywords: ['사유','이유','가능','부당','폭행','성희롱','계약 위반','휴업','폐업','reason','allowed','abuse','violation','closed','lý do','được phép','bạo lực','vi phạm','đóng cửa','เหตุผล','อนุญาต','ทำร้าย','ผิดสัญญา','ปิดกิจการ','alasan','boleh','kekerasan','pelanggaran','tutup'],
    src: '외국인근로자의 고용 등에 관한 법률 제25조 제1항 및 같은 법 시행령 · 확인일 2026-08-10',
    review: true,
    ko: '사용자가 근로계약을 해지하거나 갱신을 거절한 경우, 휴업·폐업 등으로 일을 계속할 수 없게 된 경우, 고용허가가 취소되거나 고용이 제한된 경우, 그리고 임금체불·폭행·성희롱처럼 부당한 처우를 받아 계속 일하기 어려운 경우가 법에서 정한 사유에 해당합니다. 내 상황이 여기에 해당하는지는 자료를 보고 고용센터가 판단하므로, 위 자가진단으로 준비물을 확인한 뒤 상담을 받으세요.',
    en: 'The law recognises reasons such as: the employer ends or refuses to renew the contract; the business suspends or closes so work cannot continue; the employment permit is cancelled or restricted; and unfair treatment such as unpaid wages, violence or sexual harassment that makes staying impossible. Whether your case fits is decided by the Employment Center after seeing your evidence, so use the self-check above and then get counselling.',
    vi: 'Luật công nhận các lý do như: người sử dụng lao động chấm dứt hoặc từ chối gia hạn hợp đồng; công ty ngừng hoạt động hoặc đóng cửa nên không thể tiếp tục làm; giấy phép tuyển dụng bị hủy hoặc bị hạn chế; và bị đối xử bất công như nợ lương, bạo lực, quấy rối tình dục. Trường hợp của bạn có phù hợp hay không do Trung tâm việc làm quyết định sau khi xem bằng chứng, hãy dùng phần tự kiểm tra ở trên rồi đi tư vấn.',
    th: 'กฎหมายรับรองเหตุผลเช่น นายจ้างบอกเลิกหรือไม่ต่อสัญญา กิจการหยุดหรือปิดจนทำงานต่อไม่ได้ ใบอนุญาตจ้างงานถูกเพิกถอนหรือถูกจำกัด และการถูกปฏิบัติอย่างไม่เป็นธรรม เช่น ค้างจ่ายค่าจ้าง ถูกทำร้าย หรือถูกล่วงละเมิดทางเพศ กรณีของคุณเข้าข่ายหรือไม่ ศูนย์จัดหางานจะพิจารณาจากหลักฐาน จึงควรใช้แบบตรวจสอบด้านบนแล้วไปขอคำปรึกษา',
    id: 'Undang-undang mengakui alasan seperti: pemberi kerja mengakhiri atau menolak memperpanjang kontrak; usaha berhenti atau tutup sehingga pekerjaan tidak bisa dilanjutkan; izin kerja dicabut atau dibatasi; dan perlakuan tidak adil seperti upah tertunggak, kekerasan, atau pelecehan seksual. Apakah kasus Anda termasuk diputuskan Pusat Ketenagakerjaan setelah melihat bukti, jadi gunakan pemeriksaan mandiri di atas lalu ikuti konsultasi.'
  },
  {
    key: 'unpaid-wage',
    keywords: ['임금','체불','월급','돈','안 줘','못 받','급여','wage','salary','unpaid','not paid','money','lương','nợ lương','không trả','tiền','ค่าจ้าง','เงินเดือน','ค้างจ่าย','ไม่จ่าย','upah','gaji','tidak dibayar','tertunggak'],
    src: '근로기준법 제36조 · 고용노동부 고객상담센터 1350 · 확인일 2026-08-10',
    ko: '임금을 받지 못했다면 사업장을 관할하는 지방고용노동관서에 신고할 수 있고, 상담은 1350입니다. 근로계약서와 통장 입금 내역, 근무시간 기록을 모아 두세요. 임금체불은 근로자 책임이 아닌 사유로 인정될 수 있어 사업장 변경 횟수에서 빠질 수 있습니다.',
    en: 'If your wages were not paid you can report it to the local labor office for your workplace, and 1350 gives guidance. Gather your contract, bank deposit records and working-hour records. Unpaid wages can be recognised as a reason that is not your fault, so the change may not count against your limit.',
    vi: 'Nếu bị nợ lương, bạn có thể tố cáo tại cơ quan lao động địa phương quản lý nơi làm việc, và gọi 1350 để được tư vấn. Hãy thu thập hợp đồng, sao kê ngân hàng và ghi chép giờ làm. Nợ lương có thể được công nhận là lý do không phải lỗi của bạn, nên lần đổi có thể không bị tính.',
    th: 'หากไม่ได้รับค่าจ้าง คุณสามารถแจ้งที่สำนักงานแรงงานท้องถิ่นที่ดูแลสถานประกอบการ และโทรปรึกษาที่ 1350 ควรรวบรวมสัญญาจ้าง รายการเงินเข้าบัญชี และบันทึกเวลาทำงาน การค้างจ่ายค่าจ้างอาจได้รับการยอมรับว่าไม่ใช่ความผิดของคุณ จึงอาจไม่ถูกนับเป็นจำนวนครั้ง',
    id: 'Bila upah Anda tidak dibayar, laporkan ke kantor ketenagakerjaan daerah tempat kerja Anda, dan hubungi 1350 untuk panduan. Kumpulkan kontrak, mutasi rekening, dan catatan jam kerja. Upah tertunggak dapat diakui sebagai alasan di luar kesalahan Anda, sehingga perpindahan mungkin tidak dihitung.'
  },
  {
    key: 'exit-insurance',
    keywords: ['출국만기','퇴직금','만기보험','받을 돈','정산','departure guarantee','severance','payout','insurance money','mãn hạn','trợ cấp thôi việc','tiền bảo hiểm','ประกันครบกำหนด','เงินชดเชย','เงินประกัน','jaminan kepulangan','pesangon','uang asuransi'],
    src: '외국인근로자의 고용 등에 관한 법률 제13조 및 같은 법 시행령 제21조 · 확인일 2026-08-13',
    ko: '출국만기보험은 회사가 매달 넣어 둔 퇴직금 성격의 돈입니다. 한 사업장에서 1년 이상 일한 뒤 출국하거나 체류자격이 바뀌면 본인이 청구할 수 있고, 출국한 때부터 14일 이내에 지급됩니다. 출국 예정일 1개월 전에 고용센터에 출국 예정 신고를 하고, 늦어도 7일 전에 삼성화재 전용 콜센터(1600-0266)로 지급 신청을 하세요. 보험금이 법정 퇴직금보다 적으면 그 차액은 회사가 따로 줘야 합니다.',
    en: 'The departure guarantee insurance is severance-type money your employer paid in monthly. If you worked at one workplace for a year or more and then leave Korea or change visa status, you claim it yourself, and it is paid within 14 days of your departure. Report your planned departure to the Employment Center a month ahead, and file the claim with the Samsung Fire line (1600-0266) at least 7 days before. If the payout is less than legal severance, the employer owes you the difference.',
    vi: 'Bảo hiểm mãn hạn xuất cảnh là khoản tiền mang tính trợ cấp thôi việc mà công ty đóng hằng tháng. Nếu bạn làm ở một nơi từ 1 năm trở lên rồi xuất cảnh hoặc đổi tư cách lưu trú, chính bạn nộp đơn nhận, và tiền được chi trả trong 14 ngày kể từ khi xuất cảnh. Hãy khai báo dự định xuất cảnh với Trung tâm việc làm trước 1 tháng, và nộp đơn tới tổng đài Samsung Fire (1600-0266) chậm nhất 7 ngày trước. Nếu tiền bảo hiểm ít hơn trợ cấp thôi việc theo luật, công ty phải trả phần chênh lệch.',
    th: 'ประกันครบกำหนดเดินทางออกคือเงินลักษณะเงินชดเชยที่บริษัทจ่ายสมทบทุกเดือน หากทำงานที่เดียวครบ 1 ปีขึ้นไปแล้วเดินทางออกหรือเปลี่ยนสถานะการพำนัก คุณเป็นผู้ยื่นขอรับเอง และจะได้รับภายใน 14 วันนับจากเดินทางออก ให้แจ้งกำหนดเดินทางออกที่ศูนย์จัดหางานล่วงหน้า 1 เดือน และยื่นคำขอกับสายด่วนซัมซุงไฟร์ (1600-0266) อย่างช้าก่อน 7 วัน หากเงินประกันน้อยกว่าเงินชดเชยตามกฎหมาย บริษัทต้องจ่ายส่วนต่างให้',
    id: 'Asuransi jaminan kepulangan adalah uang bersifat pesangon yang disetor perusahaan tiap bulan. Bila Anda bekerja di satu tempat selama satu tahun atau lebih lalu pulang atau berganti status tinggal, Anda sendiri yang mengajukan, dan dana cair dalam 14 hari sejak keberangkatan. Laporkan rencana kepulangan ke Pusat Ketenagakerjaan sebulan sebelumnya, dan ajukan ke layanan Samsung Fire (1600-0266) paling lambat 7 hari sebelumnya. Bila dananya lebih kecil daripada pesangon menurut hukum, perusahaan wajib membayar selisihnya.'
  },
  {
    key: 'claim-limit',
    keywords: ['3년','소멸시효','시효','늦었','이미 출국','지났','three years','time limit','expire','too late','already left','3 năm','thời hiệu','quá hạn','đã về nước','3 ปี','อายุความ','สายเกินไป','กลับไปแล้ว','3 tahun','kedaluwarsa','terlambat','sudah pulang'],
    src: '외국인근로자의 고용 등에 관한 법률 제13조제4항·제15조제3항 · 근로기준법 제49조 · 확인일 2026-08-13',
    ko: '출국만기보험과 귀국비용보험은 받을 사유가 생긴 날부터 3년 안에 청구해야 하고, 3년이 지나면 청구권이 사라져 한국산업인력공단으로 넘어갑니다. 밀린 임금과 퇴직금도 3년 안에 청구할 수 있으며, 이미 출국했더라도 청구가 가능합니다. 늦었다고 포기하지 말고 1600-0266이나 1350에 먼저 물어보세요.',
    en: 'Departure guarantee and return cost insurance must be claimed within 3 years of the day the entitlement arises; after that the right lapses and the money passes to HRD Korea. Unpaid wages and severance can also be claimed within 3 years, and you can still claim after you have left Korea. Do not give up because you think it is late — ask 1600-0266 or 1350 first.',
    vi: 'Bảo hiểm mãn hạn xuất cảnh và bảo hiểm chi phí hồi hương phải được yêu cầu trong vòng 3 năm kể từ ngày phát sinh quyền; quá hạn thì mất quyền và tiền chuyển về Cơ quan Phát triển Nhân lực Hàn Quốc. Lương còn nợ và trợ cấp thôi việc cũng đòi được trong 3 năm, kể cả khi bạn đã về nước. Đừng bỏ cuộc vì nghĩ đã muộn, hãy hỏi 1600-0266 hoặc 1350 trước.',
    th: 'ประกันครบกำหนดเดินทางออกและประกันค่าเดินทางกลับต้องยื่นขอภายใน 3 ปีนับจากวันที่เกิดสิทธิ หากเกินกำหนดสิทธิจะหมดไปและเงินโอนไปยังสถาบันพัฒนาทรัพยากรมนุษย์เกาหลี ค่าจ้างค้างจ่ายและเงินชดเชยก็เรียกร้องได้ภายใน 3 ปี แม้จะเดินทางกลับไปแล้วก็ยังยื่นได้ อย่าเพิ่งยอมแพ้เพราะคิดว่าสาย ให้ถาม 1600-0266 หรือ 1350 ก่อน',
    id: 'Asuransi jaminan kepulangan dan asuransi biaya kepulangan harus diklaim dalam 3 tahun sejak hak timbul; lewat dari itu haknya gugur dan dananya beralih ke HRD Korea. Upah tertunggak dan pesangon juga bisa dituntut dalam 3 tahun, bahkan setelah Anda pulang. Jangan menyerah karena merasa terlambat — tanyakan dulu ke 1600-0266 atau 1350.'
  },
  {
    key: 'how-to',
    keywords: ['어디서','어떻게','절차','고용센터','방법','서류','준비','where','how','procedure','employment center','documents','ở đâu','làm thế nào','thủ tục','trung tâm việc làm','giấy tờ','ที่ไหน','อย่างไร','ขั้นตอน','ศูนย์จัดหางาน','เอกสาร','di mana','bagaimana','prosedur','pusat ketenagakerjaan','dokumen'],
    src: 'EPS 고용허가제 안내 · 외국인종합안내센터 1345 · 확인일 2026-08-10',
    ko: '사업장 변경은 거주지나 사업장을 관할하는 고용센터에서 신청합니다. 여권과 외국인등록증, 근로계약서, 퇴사 사실을 알 수 있는 서류를 챙겨 가세요. 통역이 필요하면 1345에 먼저 전화해 예약할 수 있습니다.',
    en: 'You apply at the Employment Center for your area or your workplace. Bring your passport, alien registration card, employment contract, and anything showing that the job ended. If you need an interpreter, call 1345 first to arrange one.',
    vi: 'Bạn nộp đơn tại Trung tâm việc làm phụ trách nơi cư trú hoặc nơi làm việc. Mang theo hộ chiếu, thẻ đăng ký người nước ngoài, hợp đồng lao động và giấy tờ cho thấy đã nghỉ việc. Nếu cần phiên dịch, hãy gọi 1345 trước để sắp xếp.',
    th: 'ยื่นคำขอได้ที่ศูนย์จัดหางานที่ดูแลที่พักหรือสถานประกอบการของคุณ นำหนังสือเดินทาง บัตรประจำตัวคนต่างด้าว สัญญาจ้าง และเอกสารที่แสดงว่าออกจากงานไปด้วย หากต้องการล่าม โทร 1345 ล่วงหน้าเพื่อนัดหมายได้',
    id: 'Pengajuan dilakukan di Pusat Ketenagakerjaan wilayah tempat tinggal atau tempat kerja Anda. Bawa paspor, kartu izin tinggal, kontrak kerja, dan dokumen yang menunjukkan pekerjaan telah berakhir. Bila perlu penerjemah, telepon 1345 lebih dulu untuk mengaturnya.'
  },

  /* ── 자주 묻는 질문(faq.html)과 같은 내용 · 2026-08-23 확인 ──
     한쪽을 고치면 다른 쪽도 함께 고치세요. */
  {
    key: 'employer-fault',
    keywords: ['귀책','회사 잘못','체불','폐업','횟수 포함','employer fault','not counted','closed','unpaid','lỗi của chủ','không tính','nợ lương','phá sản','ความผิดนายจ้าง','ไม่นับ','ค้างจ่าย','ปิดกิจการ','kesalahan pemberi kerja','tidak dihitung','tunggakan','tutup'],
    src: '외국인근로자의 고용 등에 관한 법률 제25조 · 고용노동부 사업장 변경제도 안내 · 확인일 2026-08-23',
    ko: '들어가지 않습니다. 임금 체불, 휴업·폐업, 근로조건 위반처럼 근로자 잘못이 아닌 사유로 옮기는 경우는 횟수에 넣지 않습니다. 3회를 다 썼다고 들었더라도 포기하지 말고 고용센터에 사유를 밝히세요.',
    en: 'No. Moves caused by unpaid wages, shutdown or closure, or breach of working conditions are not counted. Even if you were told you used all 3 changes, explain the reason at the Employment Center before giving up.',
    vi: 'Không tính. Những trường hợp chuyển đi do nợ lương, ngừng hoạt động hoặc phá sản, vi phạm điều kiện lao động đều không tính vào số lần. Dù đã nghe nói dùng hết 3 lần, hãy trình bày lý do tại Trung tâm việc làm trước khi từ bỏ.',
    th: 'ไม่นับ กรณีย้ายเพราะค้างจ่ายค่าจ้าง หยุดหรือปิดกิจการ หรือฝ่าฝืนเงื่อนไขการทำงาน จะไม่นับรวมในจำนวนครั้ง แม้จะได้ยินว่าใช้ครบ 3 ครั้งแล้ว ก็อย่าเพิ่งยอมแพ้ ให้ชี้แจงเหตุผลที่ศูนย์จัดหางาน',
    id: 'Tidak dihitung. Perpindahan karena upah tidak dibayar, perusahaan berhenti atau tutup, atau pelanggaran syarat kerja tidak masuk hitungan. Meski diberi tahu sudah memakai 3 kali, jelaskan dulu alasannya di Pusat Ketenagakerjaan.'
  },
  {
    key: 'no-side-work',
    keywords: ['구직 기간 일','아르바이트','불법 취업','다른 곳','work while searching','illegal work','làm thêm','bất hợp pháp','trong thời gian tìm việc','ทำงานระหว่างหางาน','ผิดกฎหมาย','kerja sambil mencari','ilegal'],
    src: '외국인근로자의 고용 등에 관한 법률 · 출입국관리법 · 확인일 2026-08-23',
    ko: '안 됩니다. 사업장 변경 절차가 끝나기 전에 다른 곳에서 일하면 불법 취업이 되어 본인이 처벌받고, 일을 시킨 사업주도 처벌받습니다. 반드시 고용센터를 통한 정식 절차로만 취업하세요.',
    en: 'No. Working before the workplace change is completed counts as illegal employment: you are penalised and so is the employer who hired you. Only take a job through the official Employment Center process.',
    vi: 'Không được. Làm việc trước khi hoàn tất thủ tục đổi nơi làm việc bị coi là lao động bất hợp pháp, bạn bị xử phạt và chủ sử dụng thuê bạn cũng bị xử phạt. Chỉ nhận việc qua thủ tục chính thức của Trung tâm việc làm.',
    th: 'ไม่ได้ การทำงานก่อนที่ขั้นตอนเปลี่ยนสถานประกอบการจะเสร็จถือเป็นการทำงานผิดกฎหมาย ทั้งตัวคุณและนายจ้างที่จ้างคุณจะถูกลงโทษ ให้รับงานผ่านขั้นตอนทางการของศูนย์จัดหางานเท่านั้น',
    id: 'Tidak boleh. Bekerja sebelum proses pindah selesai termasuk kerja ilegal: Anda dihukum dan pemberi kerja yang mempekerjakan Anda juga dihukum. Terimalah pekerjaan hanya melalui prosedur resmi Pusat Ketenagakerjaan.'
  },
  {
    key: 'dorm-standard',
    keywords: ['기숙사','숙소','컨테이너','숙소 기준','dormitory','housing','container','accommodation','ký túc xá','chỗ ở','tiêu chuẩn','หอพัก','ที่พัก','มาตรฐาน','asrama','tempat tinggal','standar'],
    src: '근로기준법 제100조 · 외국인근로자 숙식정보 제공 및 비용징수 지침 · 확인일 2026-08-23',
    ko: '숙소가 기준에 못 미치면 사업장 변경 사유가 될 수 있습니다. 1인당 최소 면적과 냉난방·세탁·취사 시설 기준이 있으며, 컨테이너 숙소도 이 기준을 지켜야 합니다. 사진과 날짜를 남겨 두고 고용센터나 1345에 상담하세요.',
    en: 'Housing below the required standard can be a ground for changing workplace. There are minimum floor area, heating and cooling, laundry and cooking facility requirements, and container housing must meet them too. Keep dated photos and consult the Employment Center or 1345.',
    vi: 'Chỗ ở không đạt tiêu chuẩn có thể là lý do đổi nơi làm việc. Có quy định về diện tích tối thiểu mỗi người, thiết bị sưởi ấm và làm mát, khu giặt và nấu ăn; nhà container cũng phải đạt các tiêu chuẩn này. Hãy chụp ảnh kèm ngày tháng và hỏi Trung tâm việc làm hoặc 1345.',
    th: 'ที่พักที่ต่ำกว่ามาตรฐานอาจเป็นเหตุให้ขอเปลี่ยนสถานประกอบการได้ มีข้อกำหนดเรื่องพื้นที่ขั้นต่ำต่อคน เครื่องทำความร้อนและความเย็น พื้นที่ซักล้างและประกอบอาหาร ที่พักตู้คอนเทนเนอร์ก็ต้องเป็นไปตามนี้ ให้ถ่ายรูปพร้อมวันที่ไว้ แล้วปรึกษาศูนย์จัดหางานหรือ 1345',
    id: 'Tempat tinggal di bawah standar dapat menjadi alasan pindah tempat kerja. Ada ketentuan luas minimum per orang, pendingin dan pemanas, fasilitas cuci dan memasak; asrama kontainer pun harus memenuhinya. Simpan foto bertanggal lalu konsultasikan ke Pusat Ketenagakerjaan atau 1345.'
  },
  {
    key: 'stay-length',
    keywords: ['체류 기간','4년 10개월','최대','얼마나','how long','maximum stay','4 years 10 months','thời hạn cư trú','bao lâu','tối đa','ระยะเวลาพำนัก','นานเท่าไร','สูงสุด','masa tinggal','berapa lama','maksimal'],
    src: '외국인근로자의 고용 등에 관한 법률 제18조·제18조의2 · 제18조의4(재입국 취업 특례) · 확인일 2026-08-23',
    ko: '기본 3년에 재고용 1년 10개월을 더해 한 번에 최장 4년 10개월입니다. 성실근로자 재입국 특례 요건을 갖추면 출국 후 다시 들어와 추가로 일할 수 있습니다.',
    en: 'Three years plus 1 year 10 months of re-employment, so up to 4 years 10 months in one stay. If you meet the re-entry special case for committed workers, you can return after departure and work again.',
    vi: 'Ba năm cộng thêm 1 năm 10 tháng tái tuyển dụng, tức tối đa 4 năm 10 tháng cho một lần. Nếu đủ điều kiện tái nhập cảnh dành cho người lao động mẫn cán, bạn có thể quay lại làm việc tiếp sau khi xuất cảnh.',
    th: 'สามปีบวกการจ้างใหม่อีก 1 ปี 10 เดือน รวมสูงสุด 4 ปี 10 เดือนต่อหนึ่งครั้ง หากเข้าเกณฑ์การกลับเข้าประเทศสำหรับผู้ทำงานด้วยความซื่อสัตย์ ก็สามารถกลับมาทำงานต่อได้หลังเดินทางออกไป',
    id: 'Tiga tahun ditambah 1 tahun 10 bulan perpanjangan, jadi maksimal 4 tahun 10 bulan sekali masa tinggal. Jika memenuhi syarat masuk kembali bagi pekerja berdedikasi, Anda bisa kembali dan bekerja lagi setelah keluar.'
  },
  {
    key: 'e74-change',
    keywords: ['E-7-4','숙련기능인력','전환','비자 변경','skilled worker','change visa','E74','lao động lành nghề','chuyển visa','แรงงานฝีมือ','เปลี่ยนวีซ่า','tenaga terampil','ganti visa'],
    src: '출입국관리법 시행령 별표1의2 · 법무부 숙련기능인력(E-7-4) 점수제 안내 · 확인일 2026-08-23',
    ko: '점수제 심사를 통과하면 사업장 변경이 자유로워지고 가족을 초청할 수 있습니다. 한국어 능력, 근속 기간, 소득, 기술 자격 등이 점수에 반영되므로 근무하는 동안 미리 준비해 두면 좋습니다.',
    en: 'If you pass the points-based review, you can change workplace freely and invite your family. Korean language ability, length of service, income and technical qualifications count towards the score, so prepare while you are still working.',
    vi: 'Nếu qua được thẩm định theo thang điểm, bạn được tự do đổi nơi làm việc và bảo lãnh gia đình. Năng lực tiếng Hàn, thâm niên, thu nhập và chứng chỉ kỹ thuật đều được tính điểm, nên hãy chuẩn bị ngay khi còn đang làm việc.',
    th: 'หากผ่านการพิจารณาแบบสะสมคะแนน จะเปลี่ยนสถานประกอบการได้อย่างอิสระและพาครอบครัวมาได้ ความสามารถภาษาเกาหลี อายุงาน รายได้ และวุฒิบัตรทางเทคนิคล้วนมีผลต่อคะแนน จึงควรเตรียมตัวตั้งแต่ยังทำงานอยู่',
    id: 'Jika lolos penilaian sistem poin, Anda bebas berpindah tempat kerja dan dapat mengundang keluarga. Kemampuan bahasa Korea, masa kerja, penghasilan, dan sertifikat teknis dihitung sebagai poin, jadi persiapkan sejak masih bekerja.'
  },
  {
    key: 'where-help',
    keywords: ['상담','도움','전화','1345','1350','어디에','help','who to call','counselling','tư vấn','giúp đỡ','gọi ai','ปรึกษา','ขอความช่วยเหลือ','โทรที่ไหน','konsultasi','bantuan','telepon'],
    src: '외국인종합안내센터(1345) · 고용노동부 고객상담센터(1350) · 확인일 2026-08-23',
    ko: '외국인종합안내센터 1345는 여러 언어로 상담해 줍니다. 임금·근로조건 문제는 고용노동부 1350, 사업장 변경 절차는 관할 고용센터에 물어보세요. 이 서비스의 안내는 참고용이며, 확정 답변은 이 창구에서 받으세요.',
    en: 'The Foreigner Information Center on 1345 offers counselling in several languages. For wage and working-condition problems call the Ministry of Employment and Labor on 1350; for workplace change procedures ask your local Employment Center. This service is a guide only — get binding answers there.',
    vi: 'Tổng đài hỗ trợ người nước ngoài 1345 tư vấn bằng nhiều thứ tiếng. Vấn đề tiền lương và điều kiện lao động gọi Bộ Việc làm và Lao động 1350; thủ tục đổi nơi làm việc hỏi Trung tâm việc làm địa phương. Dịch vụ này chỉ để tham khảo — câu trả lời chính thức hãy nhận từ các nơi đó.',
    th: 'ศูนย์บริการข้อมูลชาวต่างชาติ 1345 ให้คำปรึกษาหลายภาษา ปัญหาค่าจ้างและสภาพการทำงานโทร 1350 ของกระทรวงแรงงาน ส่วนขั้นตอนเปลี่ยนสถานประกอบการให้ถามศูนย์จัดหางานในพื้นที่ บริการนี้เป็นเพียงข้อมูลอ้างอิง คำตอบที่ผูกพันให้รับจากหน่วยงานเหล่านั้น',
    id: 'Pusat Informasi Orang Asing 1345 melayani konsultasi dalam beberapa bahasa. Untuk masalah upah dan syarat kerja hubungi Kementerian Ketenagakerjaan 1350; untuk prosedur pindah tempat kerja tanyakan ke Pusat Ketenagakerjaan setempat. Layanan ini hanya panduan — jawaban resmi diperoleh dari sana.'
  }
];

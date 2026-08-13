/* 이음 — 지식베이스 (RAG-lite)
   ------------------------------------------------------------------
   · NOTICES : 게시판에 올라가는 공지 요약. 현재는 시연용 샘플입니다.
   · KB      : 질문 답변 엔진이 참고하는 유일한 근거 묶음.
               keywords 는 언어를 가리지 않고 한 배열에 모아 둡니다.
   · 답변은 반드시 src(근거)를 함께 가집니다. 근거가 없으면 답하지 않습니다.
   · review:true 인 항목은 답변 위에 "실무자 검수" 표시가 붙습니다.
   ------------------------------------------------------------------ */

const NOTICES = [
  {
    key: 'n1',
    tag: 'EPS',
    source: '고용노동부 · EPS',
    url: 'https://www.eps.go.kr',
    checked: '2026-08-10',
    ko: { title: '사업장 변경 신청, 언제까지 해야 하나요',
      points: [
        '근로계약이 끝난 날부터 1개월 안에 고용센터에 사업장 변경을 신청해야 합니다.',
        '신청하지 않고 1개월이 지나면 체류에 불이익이 생길 수 있습니다.',
        '신청은 본인이 관할 고용센터를 방문해 하는 것이 원칙입니다.'
      ] },
    en: { title: 'By when do I have to apply for a workplace change?',
      points: [
        'You must apply at the Employment Center within 1 month from the day your contract ended.',
        'If a month passes with no application, your stay in Korea can be affected.',
        'As a rule you apply in person at the Employment Center for your area.'
      ] },
    vi: { title: 'Phải nộp đơn chuyển nơi làm việc trước khi nào?',
      points: [
        'Bạn phải nộp đơn tại Trung tâm việc làm trong vòng 1 tháng kể từ ngày hợp đồng kết thúc.',
        'Nếu quá một tháng mà không nộp đơn, tư cách lưu trú của bạn có thể bị ảnh hưởng.',
        'Về nguyên tắc, bạn phải tự đến Trung tâm việc làm phụ trách khu vực để nộp.'
      ] },
    th: { title: 'ต้องยื่นคำขอเปลี่ยนสถานประกอบการภายในเมื่อใด',
      points: [
        'ต้องยื่นคำขอที่ศูนย์จัดหางานภายใน 1 เดือนนับจากวันที่สัญญาสิ้นสุด',
        'หากปล่อยให้เกินหนึ่งเดือนโดยไม่ยื่น อาจกระทบต่อสิทธิการพำนัก',
        'โดยหลักการต้องไปยื่นด้วยตนเองที่ศูนย์จัดหางานในพื้นที่'
      ] },
    id: { title: 'Kapan batas waktu mengajukan pindah tempat kerja?',
      points: [
        'Anda harus mengajukan ke Pusat Ketenagakerjaan dalam 1 bulan sejak kontrak berakhir.',
        'Bila lewat satu bulan tanpa pengajuan, status tinggal Anda bisa terpengaruh.',
        'Pada dasarnya pengajuan dilakukan sendiri di Pusat Ketenagakerjaan wilayah Anda.'
      ] }
  },
  {
    key: 'n2',
    tag: 'EPS',
    source: '고용노동부 · EPS',
    url: 'https://www.eps.go.kr',
    checked: '2026-08-10',
    ko: { title: '신청한 뒤 3개월, 이 기간이 무엇인가요',
      points: [
        '사업장 변경을 신청한 날부터 3개월 안에 새 근무처를 정해 근무처 변경 허가를 받아야 합니다.',
        '3개월 안에 정하지 못하면 원칙적으로 출국해야 합니다.',
        '병이나 사고처럼 본인이 어쩔 수 없었던 사정이 있으면 그 기간을 빼 달라고 요청할 수 있습니다. 증빙이 필요합니다.'
      ] },
    en: { title: 'The 3 months after you apply — what is it?',
      points: [
        'Within 3 months of applying you must find a new workplace and get permission for the change.',
        'If you do not, as a rule you have to leave the country.',
        'If illness or an accident made it impossible, you can ask for that period to be excluded. Proof is required.'
      ] },
    vi: { title: '3 tháng sau khi nộp đơn nghĩa là gì?',
      points: [
        'Trong vòng 3 tháng kể từ ngày nộp đơn, bạn phải tìm được nơi làm việc mới và được cấp phép thay đổi.',
        'Nếu không tìm được, về nguyên tắc bạn phải xuất cảnh.',
        'Nếu có lý do bất khả kháng như bệnh tật hay tai nạn, bạn có thể xin trừ khoảng thời gian đó. Cần giấy tờ chứng minh.'
      ] },
    th: { title: '3 เดือนหลังยื่นคำขอ หมายถึงอะไร',
      points: [
        'ภายใน 3 เดือนนับจากวันยื่นคำขอ ต้องหาที่ทำงานใหม่และได้รับอนุญาตให้เปลี่ยน',
        'หากหาไม่ได้ โดยหลักการต้องเดินทางออกนอกประเทศ',
        'หากมีเหตุสุดวิสัย เช่น เจ็บป่วยหรืออุบัติเหตุ สามารถขอให้หักช่วงเวลานั้นออกได้ แต่ต้องมีหลักฐาน'
      ] },
    id: { title: 'Apa arti 3 bulan setelah pengajuan?',
      points: [
        'Dalam 3 bulan sejak mengajukan, Anda harus menemukan tempat kerja baru dan mendapat izin perubahan.',
        'Bila tidak, pada dasarnya Anda harus meninggalkan Korea.',
        'Bila ada keadaan di luar kendali seperti sakit atau kecelakaan, Anda dapat meminta periode itu dikecualikan. Perlu bukti.'
      ] }
  },
  {
    key: 'n3',
    tag: '체불',
    source: '고용노동부',
    url: 'https://www.moel.go.kr',
    checked: '2026-08-10',
    ko: { title: '임금을 못 받았을 때 어디에 알리나요',
      points: [
        '사업장을 관할하는 지방고용노동관서에 임금체불을 신고할 수 있습니다. 상담은 1350입니다.',
        '근로계약서, 통장 입금 내역, 근무시간 기록을 모아 두면 도움이 됩니다.',
        '임금체불은 근로자 책임이 아닌 사유에 해당할 수 있어, 사업장 변경 횟수에서 빠질 수 있습니다.'
      ] },
    en: { title: 'Where do I report unpaid wages?',
      points: [
        'You can report unpaid wages to the local labor office covering your workplace. Call 1350 for guidance.',
        'Collect your contract, bank deposit records and working-hour records — they help a lot.',
        'Unpaid wages can count as a reason that is not the worker’s fault, so the change may be excluded from your limit.'
      ] },
    vi: { title: 'Bị nợ lương thì báo ở đâu?',
      points: [
        'Bạn có thể tố cáo nợ lương tại cơ quan lao động địa phương quản lý nơi làm việc. Tư vấn qua số 1350.',
        'Hãy thu thập hợp đồng lao động, sao kê ngân hàng và ghi chép giờ làm việc.',
        'Nợ lương có thể được coi là lý do không phải lỗi của người lao động, nên lần đổi này có thể không bị tính.'
      ] },
    th: { title: 'ถูกค้างจ่ายค่าจ้าง ต้องแจ้งที่ไหน',
      points: [
        'แจ้งเรื่องค้างจ่ายค่าจ้างได้ที่สำนักงานแรงงานท้องถิ่นที่ดูแลสถานประกอบการ ปรึกษาได้ที่ 1350',
        'ควรรวบรวมสัญญาจ้าง รายการเงินเข้าบัญชี และบันทึกเวลาทำงาน',
        'การค้างจ่ายค่าจ้างอาจถือเป็นเหตุที่ไม่ใช่ความผิดของลูกจ้าง จึงอาจไม่ถูกนับเป็นจำนวนครั้ง'
      ] },
    id: { title: 'Ke mana melaporkan upah yang tidak dibayar?',
      points: [
        'Laporkan ke kantor ketenagakerjaan daerah yang menaungi tempat kerja Anda. Konsultasi lewat 1350.',
        'Kumpulkan kontrak kerja, mutasi rekening, dan catatan jam kerja.',
        'Upah tertunggak bisa dianggap bukan kesalahan pekerja, sehingga perpindahan ini mungkin tidak dihitung.'
      ] }
  }
];

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
  }
];

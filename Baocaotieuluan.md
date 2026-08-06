_MỞ ĐẦU_

_Tiêu đề phần nội dung chính của trang hiện có (vd MỤC LỤC …) in nghiêng_

_Tiêu đề phần nội dung chính của trang hiện có (vd MỤC LỤC …) in nghiêng_

_GIẢI PHÁP CHO BÀI TOÁN / VẤN ĐỀ / MÔ HÌNH_

_TỔNG QUAN ĐỀ TÀI_

**B\*\***Ộ GIÁO DỤC VÀ ĐÀO TẠO\*\*

**TRƯỜNG ĐẠI HỌC NÔNG LÂM TP HCM**

**KHOA CÔNG NGHỆ THÔNG TIN**

**TIỂU\*\*** \***\*LUẬN TỐT NGHIỆP**

NGHIÊN CỨU VÀ SO SÁNH NESTJS VÀ FASTAPI

TRONG PHÁT TRIỂN BACKEND HỆ THỐNG QUẢN LÝ CỬA HÀNG TIỆN LỢI MINI.

Ư/2014

**:**

**:**

**:**

**:**

**Ngành**

**Niên khoá**

**Lớp**

**Sinh viên thực hiện**

**Công nghệ thông tin**

**2022 - 2026**

**DH22DTA**

**Hoàng Lê Nguyên Mạnh**

**CÁN BỘ HƯỚNG DẪN**

Ths. Nguyễn Đức Công Song

**SINH VIÊN THỰC HIỆN**

Hoàng Lê Nguyên Mạnh (MSSV: 22130163)

TP.HỒ CHÍ MINH, tháng 07 năm 2024

**B\*\***Ộ GIÁO DỤC VÀ ĐÀO TẠO\*\*

**TRƯỜNG ĐẠI HỌC NÔNG LÂM TP HCM**

**KHOA CÔNG NGHỆ THÔNG TIN**

TIỂU LUẬN TỐT NGHIỆP

NGHIÊN CỨU VÀ SO SÁNH NESTJS VÀ FASTAPI

TRONG PHÁT TRIỂN BACKEND HỆ THỐNG QUẢN LÝ CỬA HÀNG TIỆN LỢI MINI.

TP.HỒ CHÍ MINH, tháng năm

Ư/2014

**B\*\***Ộ GIÁO DỤC VÀ ĐÀO TẠO\*\*

**TRƯỜNG ĐẠI HỌC NÔNG LÂM TP HCM**

**KHOA CÔNG NGHỆ THÔNG TIN**

TIỂU LUẬN TỐT NGHIỆP

**TÊN ĐỀ TÀI**

**CÁN BỘ HƯỚNG DẪN \*\*** \***\*SINH VIÊN THỰC HIỆN**

    TS. Lê…………………	**             **1. Nguyễn Văn A…. (MSSV:…..)

    Ths. Nguyễn…………..		**   **2.** **Lê V…..……........(MSSV:….)

TP.HỒ CHÍ MINH, tháng năm

Ư/2014

DANH SÁCH CHỮ VIẾT TẮT

    ANSI	**A**merican **N**ational **S**tandards **I**nstitute

    	Học viện chuẩn hoá quốc gia Mỹ

    ATM	**A**utomatic **T**eller **M**achine

    	Máy rút tiền tự động

    CA	**C**ertification **A**uthority

    	Chứng thực

    ISO	**I**nternational **S**tandardizations **O**rganization

    	Tổ chức chuẩn hoá quốc tế

    MAC	**M**essage **A**uthentication **C**ode

    	Mã chứng thực thông điệp

    UUCP	**U**nix-to-**U**nix **C**opy **P**rotocol

    	Giao thức truyền nhận thông điệp trên Unix

DANH MỤC HÌNH ẢNH

    Hình 2.1 Mạch chỉnh lưu và bộ lọc	3

- DANH MỤC BẢNG

  Bảng 1.1: Tên bảng 19

- TÓM TẮT

Sự bùng nổ của các chuỗi cửa hàng tiện lợi tại Việt Nam (Circle K, FamilyMart, 7-Eleven...) [1] đặt ra yêu cầu cấp thiết về một hệ thống quản lý backend đáp ứng tốt việc kiểm soát kho vận theo thời gian thực, vận hành quầy POS hiệu quả và đảm bảo toàn vẹn dữ liệu báo cáo. Tiểu luận này nghiên cứu và so sánh hai framework backend phổ biến NestJS (TypeScript, TypeORM, Passport.js) và FastAPI (Python, SQLAlchemy, FastAPI Security) nhằm xác định giải pháp công nghệ phù hợp cho bài toán trên.

Để đảm bảo tính khách quan, đề tài triển khai hai hệ thống backend thực nghiệm (prototype) song song, cùng thiết kế một bộ chức năng nghiệp vụ thống nhất trên cả hai nền tảng, bao gồm: quản lý sản phẩm và tồn kho theo nguyên tắc FEFO (xuất hàng cận hạn trước), quản lý ca làm việc và đối soát quỹ tiền mặt, xử lý đơn hàng POS với nhiều hình thức thanh toán (tiền mặt, thẻ, chuyển khoản ZaloPay), quản lý khuyến mãi, trả hàng, kiểm kê kho định kỳ và báo cáo doanh thu. Hai hệ thống được xây dựng với kiến trúc REST API tương đồng, cùng cơ chế xác thực JWT, phân quyền theo vai trò (admin/leader/cashier), và cùng bộ ràng buộc nghiệp vụ (transaction, row-lock chống race-condition khi trừ kho).

Kết quả so sánh được thực hiện trên ba tiêu chí chính: (1) tốc độ phát triển và cấu hình ban đầu; (2) hiệu năng API (thời gian phản hồi, throughput); (3) khả năng quản lý dữ liệu và bảo mật hệ thống. Từ đó, tiểu luận đưa ra bảng đánh giá định lượng và định tính, làm cơ sở khuyến nghị lựa chọn công nghệ phù hợp theo quy mô và yêu cầu thực tế của từng cửa hàng tiện lợi.

**MỤC LỤC**

DANH SÁCH CHỮ VIẾT TẮT 1

DANH MỤC HÌNH ẢNH 2

DANH MỤC BẢNG 3

TÓM TẮT 4

MỞ ĐẦU 6

    	1.	LÝ DO CHỌN ĐỀ TÀI	6

    	2.	MỤC TIÊU VÀ PHẠM VI NGHIÊN CỨU	6

    	3.	Ý NGHĨA KHOA HỌC VÀ THỰC TIỄN CỦA ĐỀ TÀI	6

CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI 7

    1. 1. Phân tích, đánh giá các công trình nghiên cứu đã có liên quan đến đề tài nghiên cứu	7

    1. 2. Nêu những vấn đề còn tồn tại	7

    1. 3. Chỉ ra những vấn đề mà tiểu luận cần tập trung nghiên cứu, giải quyết	7

CHƯƠNG 2. PHƯƠNG PHÁP VÀ NỘI DUNG NGHIÊN CỨU 8

    2. 1. Trình bày cơ sở lí thuyết, lí luận, giả thiết khoa học	8

    2. 2. Trình bày mô hình lý thuyết của giải pháp đã đề xuất sử dụng trong tiểu luận	8

CHƯƠNG 3. GIẢI PHÁP CHO BÀI TOÁN/VẤN ĐỀ/MÔ HÌNH 9

    3.1. Phát biểu mô hình/bài toán trong đề tài: cụ thể, rõ ràng, có thể phát biểu bằng ngôn ngữ tự nhiên, hay mô hình toán học, …	9

    3.2. Giải pháp cụ thể để giải quyết mô hình/bài toán:	9

3.3 HIỆN THỰC GIẢI PHÁP 10

CHƯƠNG 5. KẾT QUẢ, KẾT LUẬN VÀ KIẾN NGHỊ 12

    5.1. KẾT QUẢ	12

    5. 2. KẾT LUẬN	12

    5. 3. KIẾN NGHỊ	12

PHỤ LỤC (nếu có) 14

MỞ ĐẦU

- LÝ DO CHỌN ĐỀ TÀI

Trong những năm gần đây, việc lựa chọn giữa môi trường thực thi Node.js và Python cho các hệ thống Web API hiện đại đã được nhiều nghiên cứu thực nghiệm phân tích. Nghiên cứu của Lei, Ma và Tan (2014) [2] thực hiện bằng cả benchmark khách quan lẫn kiểm thử theo kịch bản hành vi người dùng thực tế chỉ ra rằng cơ chế non-blocking I/O của Node.js giúp xử lý được lượng request lớn hơn đáng kể trong cùng một khoảng thời gian so với các nền tảng Python-Web truyền thống, đặc biệt phù hợp với các ứng dụng thâm dụng I/O (I/O-intensive). Tuy nhiên, kết quả này được ghi nhận trên các mô hình Python-Web đồng bộ (WSGI) tại thời điểm nghiên cứu. Theo Lathkar (2023) [6], sự ra đời của chuẩn ASGI (Asynchronous Server Gateway Interface) nền tảng của các framework Python hiện đại như FastAPI cùng cơ chế xử lý bất đồng bộ dựa trên asyncio và thư viện validate dữ liệu Pydantic đã giúp Python thu hẹp đáng kể khoảng cách hiệu năng so với các nền tảng bất đồng bộ như Node.js, so với thời điểm các nền tảng Python còn vận hành chủ yếu theo mô hình đồng bộ WSGI.

Phần lớn các công trình so sánh hiện có bao gồm cả nghiên cứu của Lei và cộng sự [2] chỉ dừng lại ở việc so sánh các tác vụ đơn lẻ mang tính tổng quát (như request/response cơ bản, CRUD đơn giản), chưa đặt hai nền tảng vào một bối cảnh nghiệp vụ có logic giao dịch phức tạp và yêu cầu điều khiển đồng thời (concurrency control) nghiêm ngặt như trong bán lẻ [3]. Do đó, đề tài này đóng góp một góc nhìn thực tiễn hơn bằng cách áp dụng NestJS (TypeScript) và FastAPI (Python) vào đúng bối cảnh Hệ thống Quản lý Cửa hàng Tiện lợi một bài toán đòi hỏi cả sự chặt chẽ về mặt kiến trúc phần mềm lẫn khả năng xử lý đồng thời an toàn cho các giao dịch tại điểm bán (POS).

- MỤC TIÊU VÀ PHẠM VI NGHIÊN CỨU

**Mục tiêu:**

Phân tích đặc điểm kiến trúc REST API của NestJS (TypeScript/TypeORM) so với FastAPI (Python/SQLAlchemy/FastAPI Security), cùng triển khai trên nền PostgreSQL để đảm bảo tính tương đồng về tầng dữ liệu khi so sánh.

Xây dựng hai phiên bản thực nghiệm (prototype) backend cùng một bộ chức năng nghiệp vụ bán lẻ đầy đủ để thu thập dữ liệu so sánh.

Xây dựng một ứng dụng frontend (React) kết nối tới hai backend nhằm minh họa quy trình nghiệp vụ thực tế và phục vụ demo, kiểm thử end-to-end các API đã phát triển.

So sánh dựa trên ba tiêu chí: (1) tốc độ phát triển và cấu hình ban đầu; (2) hiệu năng API (thời gian phản hồi, throughput); (3) khả năng quản lý dữ liệu và bảo mật hệ thống.

**Phạm vi nghiên cứu\*\***: \*\*

**Kiến trúc hệ thống:** trọng tâm nghiên cứu và so sánh tập trung hoàn toàn vào tầng backend (REST API). Đề tài xây dựng thêm một giao diện frontend bằng React với vai trò hỗ trợ làm công cụ trực quan hóa luồng nghiệp vụ và kiểm thử end-to-end các API đã phát triển, không phải đối tượng nghiên cứu độc lập; đề tài không đi sâu phân tích kiến trúc, hiệu năng hay trải nghiệm người dùng riêng của frontend.

**Đối tượng quản lý:** hàng hóa tiêu dùng có mã vạch định danh. Đề tài chủ yếu tập trung triển khai và thực nghiệm cho một chi nhánh (một điểm bán), tuy nhiên kiến trúc dữ liệu và phân quyền được thiết kế theo hướng hỗ trợ mở rộng nhiều chi nhánh (multi-branch) trong tương lai, phù hợp với mô hình chuỗi cửa hàng tiện lợi thực tế tại Việt Nam [5].

**Giới hạn nghiệp vụ: **hệ thống triển khai đầy đủ vòng đời vận hành một cửa hàng tiện lợi, bao gồm quản lý danh mục/sản phẩm, quản lý tồn kho theo lô hàng (batch) với cơ chế FEFO, nhập kho và điều chỉnh hao hụt, quản lý ca làm việc và đối soát quỹ, xử lý đơn hàng POS đa hình thức thanh toán (tiền mặt, thẻ, chuyển khoản qua cổng ZaloPay), khuyến mãi, trả hàng, kiểm kê định kỳ và báo cáo doanh thu. Đề tài không thực hiện các nghiệp vụ kế toán chuyên sâu (thuế, sổ sách tài chính, công nợ nhà cung cấp), hoặc quản lý nhập xuất kho chuyên sâu.

**Cơ sở dữ liệu và Cấu trúc Caching: **Cả hai hệ thống thực nghiệm đều sử dụng chung PostgreSQL làm hệ quản trị CSDL quan hệ chính và Redis làm tầng lưu trữ dữ liệu tạm thời (In-memory Data Store / Caching Layer). PostgreSQL đảm bảo tính toàn vẹn dữ liệu (ACID) cho các giao dịch tài chính, lưu kho FEFO và đối soát ca. Redis đóng vai trò tối ưu hóa hiệu năng thông qua việc cache danh mục sản phẩm/mã vạch, quản lý Session/Token ca làm việc, và hỗ trợ khóa phân tán (Distributed Lock) để xử lý tranh chấp tồn kho (race-condition) khi nhiều quầy POS thanh toán đồng thời [3]. Việc dùng chung cặp PostgreSQL + Redis giúp loại trừ yếu tố khác biệt về hạ tầng lưu trữ, đảm bảo tính công bằng tuyệt đối khi đo lường và so sánh hiệu năng (latency, throughput) giữa NestJS và FastAPI.

**Môi trường triển khai: **ứng dụng web, chạy ổn định trên trình duyệt máy tính.

- Ý NGHĨA KHOA HỌC VÀ THỰC TIỄN CỦA ĐỀ TÀI

Nghiên cứu và so sánh hai framework backend NestJS và FastAPI trong phát triển hệ thống quản lý cửa hàng tiện lợi mini, từ đó đề xuất giải pháp công nghệ phù hợp giúp tối ưu tốc độ phát triển, hiệu năng và bảo mật cho hệ thống backend bán lẻ.

Trong bối cảnh mô hình cửa hàng tiện lợi tại Việt Nam đang phát triển nhanh với các thuộc tính bán lẻ đặc trưng riêng của thị trường có nền kinh tế chuyển đổi [5], đề tài cung cấp cho cộng đồng phát triển và các doanh nghiệp nhỏ một cơ sở tham khảo thực nghiệm, khách quan để lựa chọn công nghệ backend phù hợp khi triển khai các hệ thống quản lý bán lẻ như cửa hàng tiện lợi, siêu thị mini, chuỗi cửa hàng.

- CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI

- Phân tích, đánh giá các công trình nghiên cứu đã có liên quan đến đề tài nghiên cứu

Trong kiến trúc phát triển hệ thống backend hiện đại, việc lựa chọn framework đóng vai trò quyết định đến tốc độ phát triển, hiệu năng vận hành và khả năng bảo trì lâu dài của ứng dụng. Để đánh giá và lựa chọn công nghệ phù hợp, đã có nhiều công trình nghiên cứu tiếp cận vấn đề này dưới các góc độ khác nhau:

Về góc độ đánh giá công nghệ và năng suất phát triển: Luận văn thạc sĩ của Koder (2021) [1] đã tiến hành khảo sát diện rộng gần 90 framework backend và frontend thuộc các ngôn ngữ phổ biến nhằm xác định công nghệ tối ưu năng suất phát triển full-stack. Nghiên cứu xác định NestJS (TypeScript) và FastAPI (Python) là một trong các đại diện giàu tính năng nhất (most feature-rich) trong hệ sinh thái tương ứng, đồng thời chỉ ra rằng hai tính năng kỹ thuật cốt lõi giúp tăng năng suất lập trình và giảm mã nguồn lặp lại (repetitive code) chính là khả năng tự động hóa kiểm tra dữ liệu (schema-based request binding) và tự động suy luận tài liệu API (inferred OpenAPI documentation) đây đều là hai điểm mạnh có sẵn ở cả NestJS và FastAPI.

Về góc độ hiệu năng thực nghiệm giữa các nền tảng backend: Nghiên cứu công bố tại IEEE của Lei, Ma và Tan (2014) [2] đã so sánh hiệu năng Node.js, Python-Web và PHP bằng cả benchmark khách quan lẫn kiểm thử theo kịch bản hành vi người dùng thực tế, kết luận Node.js xử lý được lượng request lớn hơn đáng kể trong cùng thời gian, đặc biệt phù hợp các ứng dụng thâm dụng I/O. Bổ sung cho góc nhìn này, Lathkar (2023) [6] phân tích chi tiết cách kiến trúc ASGI của FastAPI kết hợp asyncio và Pydantic đạt hiệu năng vượt trội so với các framework Python vận hành theo mô hình đồng bộ WSGI, cho thấy khoảng cách hiệu năng giữa hai nền tảng đã được thu hẹp đáng kể so với các nghiên cứu benchmark trước đây. Về tầng truy xuất dữ liệu, nghiên cứu của Attala và Khemapatpapan (2025) [4] khi so sánh hiệu năng các ORM phổ biến trên PostgreSQL trong môi trường Docker/TypeScript (bao gồm TypeORM) cho thấy không có ORM nào vượt trội tuyệt đối ở mọi khía cạnh, mà hiệu năng phụ thuộc vào loại quan hệ dữ liệu và ngữ cảnh sử dụng cụ thể.

Về góc độ điều khiển đồng thời (concurrency) trong hệ thống tồn kho: Nghiên cứu của Pophali (2025) trên World Journal of Advanced Engineering Technology and Sciences [3] phân tích các chiến lược điều khiển đồng thời, các mức độ cô lập giao dịch cơ sở dữ liệu (database isolation levels) và cơ chế khóa lạc quan (optimistic locking) trong bài toán tồn kho thương mại điện tử, chỉ ra rằng các nền tảng bán lẻ hiện đại phải xử lý đồng thời khối lượng lớn giao dịch tranh chấp cùng một mặt hàng giới hạn số lượng mà không gây ra hiện tượng bán vượt tồn kho (overselling).

Về bối cảnh nghiệp vụ bán lẻ tại Việt Nam: Nghiên cứu của Nguyễn Thanh Minh, Nguyễn Công Dũng và Lê Anh Huyền Trâm (2019) trên Tạp chí Khoa học Đại học Mở Thành phố Hồ Chí Minh – Kinh tế và Quản trị Kinh doanh [5] khảo sát và khám phá các thuộc tính bán lẻ của mô hình cửa hàng tiện lợi tại thị trường Việt Nam một thị trường có nền kinh tế chuyển đổi bằng phương pháp nghiên cứu hỗn hợp (định tính kết hợp định lượng), xác định được 5 thuộc tính bán lẻ cốt lõi (tiện ích, tiện lợi giữ xe, tiện lợi lựa chọn hàng hóa, tiện lợi vị trí/thời gian, dịch vụ khách hàng). Kết quả này cho thấy đây là loại hình bán lẻ có đặc thù vận hành riêng và mức độ phát triển đáng kể tại Việt Nam, đòi hỏi hệ thống vận hành (bao gồm cả tầng công nghệ backend) phải đáp ứng được yêu cầu về tốc độ xử lý và độ tin cậy trong giao dịch hàng ngày.

Đánh giá tổng quan: Bốn hướng nghiên cứu trên bổ trợ cho nhau nhưng chưa có công trình nào kết hợp đồng thời: (1) đánh giá framework theo tiêu chí năng suất/tính năng như Koder [1]; (2) đo lường hiệu năng thực nghiệm cả ở tầng ứng dụng lẫn tầng ORM như Lei và cộng sự [2], Lathkar [6], Attala và Khemapatpapan [4]; và (3) xử lý an toàn các race-condition trong nghiệp vụ tồn kho như Pophali [3] trên cùng một hệ thống nghiệp vụ bán lẻ hoàn chỉnh, đặt trong bối cảnh thị trường cửa hàng tiện lợi Việt Nam đang phát triển [5]. Phần lớn các đánh giá hiệu năng hiện có giữa NestJS và FastAPI chỉ dừng lại ở các bài kiểm tra hiệu năng thuần túy (synthetic benchmarks) trên các tác vụ giả lập đơn giản, chưa được đặt vào một kịch bản nghiệp vụ bán lẻ thực tế với đầy đủ tính phức tạp (như xử lý lô hàng FEFO, đối soát quỹ, race-condition). Đây chính là cơ sở để đề tài tiến hành phân tích và so sánh thực nghiệm hai framework này trên cùng một hệ thống quản lý cửa hàng tiện lợi mini.

- Nêu những vấn đề còn tồn tại

Qua tổng quan các công trình nghiên cứu học thuật liên quan, tác giả nhận thấy hai khoảng trống lớn còn tồn tại như sau:

**Hạn chế trong các nghiên cứu đánh giá công nghệ:** Mặc dù nghiên cứu của Koder (2021) [1] đã khẳng định ưu thế vượt trội về mặt tính năng (schema validation, inferred OpenAPI) và chỉ số tăng trưởng cộng đồng của NestJS và FastAPI, công trình này chủ yếu dừng lại ở mức khảo sát, đánh giá định tính trên lý thuyết, không đo lường hiệu năng thực nghiệm. Trong khi đó, các nghiên cứu benchmark định lượng như Lei và cộng sự [2] lại thực hiện trên các tác vụ web tổng quát, chưa gắn với một framework cụ thể như NestJS hay FastAPI, và cũng chưa đặt trong bối cảnh nghiệp vụ có logic giao dịch phức tạp. Việc thiếu hụt các thực nghiệm đo lường hiệu năng chuyên sâu (thời gian phản hồi, năng suất xử lý, mức tiêu thụ tài nguyên) của hai framework này dưới áp lực truy cập đồng thời (concurrent requests) trong một nghiệp vụ thực tế vẫn chưa được giải quyết trọn vẹn.

**Hạn chế trong nghiên cứu về điều khiển đồng thời gắn với framework cụ thể:** Nghiên cứu của Pophali [3] đã cung cấp nền tảng lý thuyết vững chắc về concurrency control và optimistic locking trong tồn kho thương mại điện tử, nhưng chưa chỉ ra cách hai framework backend cụ thể (NestJS/TypeORM và FastAPI/SQLAlchemy) hiện thực hóa các cơ chế khóa (pessimistic locking, SELECT ... FOR UPDATE) khác nhau như thế nào khi cùng triển khai trên một schema dữ liệu và một bài toán nghiệp vụ giống hệt nhau.

Đứng trước những hạn chế trên, tiểu luận tiến hành nghiên cứu thực nghiệm nhằm đánh giá toàn diện cả về mặt kiến trúc, năng suất phát triển và hiệu năng thực tế của NestJS và FastAPI, từ đó đưa ra khuyến nghị công nghệ tối ưu cho bài toán hệ thống quản lý cửa hàng tiện lợi mini.

- Chỉ ra những vấn đề mà tiểu luận cần tập trung nghiên cứu, giải quyết

Từ những hạn chế của các công trình nghiên cứu trước, tiểu luận xác định các vấn đề trọng tâm cần tập trung giải quyết như sau:

**So sánh kiến trúc và mô hình xử lý backend:** Phân tích sự khác biệt về triết lý thiết kế giữa kiến trúc chuẩn hóa, chặt chẽ (opinionated) của NestJS (mô hình Module – Controller – Service kết hợp TypeScript, Dependency Injection) và triết lý linh hoạt (unopinionated) của FastAPI (kết hợp Python type hinting, Pydantic và chuẩn ASGI [6]). Từ đó, làm rõ ưu/nhược điểm của từng mô hình trong việc tổ chức, đóng gói và duy trì mã nguồn cho hệ thống backend bán lẻ quy mô vừa và nhỏ.

**Đánh giá hiệu năng thực nghiệm trong kịch bản tải thực tế:** Khắc phục hạn chế của các bài kiểm tra hiệu năng thuần túy trên tác vụ tổng quát như [2], tiểu luận đo lường trực tiếp các chỉ số định lượng (thời gian phản hồi, throughput, tỷ lệ lỗi dưới áp lực truy cập đồng thời) của NestJS và FastAPI khi thực hiện các giao dịch thời gian thực tương tác với CSDL PostgreSQL, đồng thời đối chiếu với đặc điểm hiệu năng ORM (TypeORM/SQLAlchemy) đã được ghi nhận trong [4].

**Gắn kết công nghệ với bài toán nghiệp vụ bán lẻ thực tế:** Kế thừa nền tảng lý thuyết về concurrency control từ [3], tiểu luận trực tiếp xây dựng hai hệ thống backend thực nghiệm (prototype) hoàn chỉnh trên cùng một bộ chức năng nghiệp vụ chuẩn (vận hành POS, quản lý tồn kho theo lô FEFO, đối soát ca làm việc, xử lý tranh chấp dữ liệu/race-condition) nhằm đánh giá công nghệ dựa trên bối cảnh vận hành thực tế của thị trường cửa hàng tiện lợi Việt Nam [5], thay vì lý thuyết thuần túy.

**Xây dựng cơ sở khuyến nghị công nghệ đa chiều:** Kết hợp các dữ liệu thực nghiệm định lượng (hiệu năng API, mức sử dụng tài nguyên) và đánh giá định tính (độ phức tạp mã nguồn, năng suất phát triển, độ lặp lại mã nguồn) để đưa ra khung khuyến nghị lựa chọn công nghệ phù hợp với từng quy mô triển khai và nguồn lực nhân sự của doanh nghiệp cửa hàng tiện lợi mini.

CHƯƠNG 2 PHƯƠNG PHÁP VÀ NỘI DUNG NGHIÊN CỨU

2.1. Cở sở lý thuyết

2.1.1. Kiến trúc phần mềm phân lớp (Layered Architecture):

Kiến trúc phân lớp (layered architecture), còn được gọi là kiến trúc n-tier, là mô hình kiến trúc phổ biến và được sử dụng rộng rãi nhất trong phát triển phần mềm, mô tả một cấu trúc gồm nhiều lớp (layer) nằm ngang hoạt động cùng nhau như một khối phần mềm thống nhất. Mỗi lớp là một sự tách biệt về mặt logic của các thành phần, trong đó các thành phần có chức năng liên quan hoặc tương tự nhau thường được đặt trong cùng một lớp, còn mỗi lớp lại đảm nhiệm một phần khác nhau trong tổng thể hệ thống. Một đặc điểm quan trọng của mô hình này là các lớp chỉ giao tiếp trực tiếp với lớp liền kề ngay bên dưới nó, tạo thành một chuỗi phụ thuộc tuyến tính giữa các tầng. [7]

Các tầng phổ biến trong một kiến trúc phân lớp gồm:

**Presentation Layer (Controller/Router):** tiếp nhận và phản hồi request từ client.

**Business Logic Layer (Service):** xử lý các quy tắc nghiệp vụ.

**Domain Layer:** chịu trách nhiệm cho thuật toán và các thành phần lập trình cốt lõi.

**Data Access Layer (Repository/CRUD):** thao tác trực tiếp với cơ sở dữ liệu.

Cách tổ chức này hiện thực hóa nguyên tắc Separation of Concerns (SoC) mỗi lớp chỉ tập trung vào một mối quan tâm duy nhất, giúp hệ thống dễ kiểm thử độc lập và cho phép thay đổi công nghệ ở một tầng mà không ảnh hưởng đến các tầng còn lại.

Ảnh 1: Kiến trúc phần mềm 3 lớp.

**Liên hệ đề tài**: Cả NestJS và FastAPI trong đề tài đều tổ chức module nghiệp vụ theo đúng cấu trúc ba tầng Presentation Layer → Business Logic Layer→ Data Access Layer .

2.1.2. Kiến trúc ASGI và WSGI trong ứng dụng Python

WSGI (Web Server Gateway Interface) là chuẩn giao tiếp truyền thống giữa web server và ứng dụng Python, được thiết kế cho mô hình xử lý đồng bộ: mỗi request được xử lý tuần tự và chặn luồng thực thi (blocking) cho đến khi hoàn tất, phù hợp với các ứng dụng web dạng request–response truyền thống. ASGI (Asynchronous Server Gateway Interface) ra đời như phần kế thừa tinh thần của WSGI, mở rộng thêm khả năng xử lý bất đồng bộ cho hệ sinh thái Python [16]. Một ứng dụng ASGI là một đối tượng có thể gọi bất đồng bộ (asynchronous callable), tiếp nhận thông tin kết nối (scope) và giao tiếp hai chiều với client thông qua các hàm bất đồng bộ receive/send, nhờ đó có thể phục vụ đồng thời nhiều kết nối mà không chặn luồng chính, đồng thời hỗ trợ thêm các giao thức thời gian thực như WebSocket bên cạnh HTTP [16].

Ảnh 2: Sơ đồ luồng xử lý WSGI

Ảnh 3: Sơ đồ luồng xử lý ASGI

Liên hệ đề tài: FastAPI được xây dựng trên chuẩn ASGI (thông qua Uvicorn) kết hợp asyncio và SQLAlchemy AsyncSession, cho phép các thao tác I/O (truy vấn CSDL, gọi API ZaloPay) không chặn luồng xử lý các request khác, phù hợp với đặc thù xử lý đồng thời nhiều quầy POS của hệ thống trong đề tài.

2.1.3. Object-Relational Mapping (ORM)

Object-Relational Mapping (ORM) là kỹ thuật lập trình nhằm giải quyết sự không tương thích (impedance mismatch) giữa mô hình hướng đối tượng (OOP) mà tầng ứng dụng backend sử dụng và mô hình dữ liệu quan hệ dạng bảng của cơ sở dữ liệu [17]. ORM đóng vai trò lớp trung gian giữa mã nguồn và cơ sở dữ liệu, cho phép lập trình viên thao tác dữ liệu (tạo, đọc, cập nhật, xóa) thông qua các đối tượng và phương thức quen thuộc của ngôn ngữ lập trình thay vì viết trực tiếp câu lệnh SQL; khi hệ thống ngày càng có nhiều lớp và quan hệ dữ liệu phức tạp, các công cụ ORM giúp tập trung hóa và tự động hóa việc ánh xạ cũng như sinh mã SQL tương ứng [17].

Liên hệ đề tài: TypeORM (NestJS) và SQLAlchemy (FastAPI) là hai ORM tương ứng được dùng trong đề tài để ánh xạ các entity nghiệp vụ (sản phẩm, lô hàng, đơn hàng, ca làm việc) sang các bảng PostgreSQL, đồng thời cung cấp cơ chế quản lý transaction và khóa pessimistic_write (SELECT ... FOR UPDATE) khi xử lý race-condition trong nghiệp vụ trừ kho FEFO đã trình bày ở mục 2.1.6.

2.1.4. Dependency Injection và Inversion of Control (IoC)

Đảo ngược quyền điều khiển ( Inversion of Control ): là một nguyên lý trong kỹ thuật phần mềm, theo đó việc kiểm soát các đối tượng hoặc một phần của chương trình được chuyển giao cho một container hoặc framework, thường được áp dụng trong ngữ cảnh lập trình hướng đối tượng. Xét về khía cạnh quản lý phụ thuộc, IoC liên quan đến việc tiêm (inject) các phụ thuộc vào các lớp thông qua một bộ điều khiển hoặc container bên ngoài, thường xảy ra tại thời điểm runtime. [8]

**Nguyên lý này đem lại lợi ích:** giảm sự ràng buộc chặt (tight coupling) giữa các thành phần, tăng khả năng kiểm thử độc lập, và tập trung hóa việc quản lý vòng đời đối tượng vào một container duy nhất.

Dependency Injection: là một mẫu thiết kế (pattern) mà chúng ta có thể sử dụng để triển khai nguyên lý IoC, trong đó quyền điều khiển được "đảo ngược" chính là việc thiết lập các phụ thuộc (dependencies) cho một đối tượng.[8]

Thay vì bản thân các đối tượng tự khởi tạo phụ thuộc cho mình, việc kết nối các đối tượng với nhau hay "inject" đối tượng này vào đối tượng khác sẽ do một assembler (bộ lắp ráp / DI container) đảm nhận.

**Liên hệ đề tài:** NestJS hiện thực hóa IoC/DI qua decorator @Injectable() với container tự động phân giải phụ thuộc theo constructor; FastAPI hiện thực hóa nguyên lý tương tự qua hệ thống Depends().

2.1.5. Rest API

REST (Representational State Transfer) là kiểu kiến trúc phần mềm phổ biến để xây dựng ứng dụng mạng, cung cấp tập quy tắc giúp tạo ra các web service đơn giản, dễ mở rộng và dễ tích hợp. Một REST API xoay quanh khái niệm tài nguyên (resource) như người dùng, sản phẩm, đơn hàng và cho phép client truy cập, thao tác các tài nguyên này thông qua tập thao tác phi trạng thái (stateless) được định nghĩa sẵn. [9]

Về cơ chế vận hành, REST API xử lý theo bốn bước: client gửi request đến một URL cụ thể (kèm HTTP method, header, và dữ liệu nếu có); server xác thực và xử lý request (truy vấn, tạo mới hoặc cập nhật tài nguyên); server trả về response kèm mã trạng thái HTTP (200 OK, 404 Not Found, 401 Unauthorized...); dữ liệu trao đổi là một "representation" trạng thái của tài nguyên, thường ở định dạng JSON vì nhẹ và dễ xử lý. [9]

Ảnh 2 Cách thức hoạt động của RestFul API.

Một hệ thống tuân thủ đầy đủ các ràng buộc kiến trúc của REST được gọi là "RESTful". Các ràng buộc chính gồm: [9]

**Uniform interface:** giao diện nhất quán giữa client-server, đạt được qua HTTP method chuẩn, URI định danh tài nguyên, và cơ chế hypermedia (HATEOAS).

**Statelessness:** mỗi request phải tự chứa đủ thông tin cần thiết; server không lưu trạng thái phiên của client giữa các request, giúp hệ thống dễ mở rộng ngang.

**Client-server architecture:** client và server tách biệt, cho phép hai phía phát triển độc lập.

**Cacheability:** response cần được xác định có thể cache hay không, giúp cải thiện hiệu năng khi tái sử dụng cho các request giống nhau.

**Layered system:** có thể chèn thêm các tầng trung gian (API gateway, load balancer) mà client không cần biết, giúp tăng khả năng mở rộng và bảo mật.

**Liên hệ đề tài:** Việc xây dựng song song hai backend cùng phục vụ một API Contract dùng chung đòi hỏi tuân thủ nhất quán các ràng buộc REST, đặc biệt là chuẩn hóa response và stateless authentication (qua JWT).

2.1.6. Pessimistic Locking and Concurrency Control

Khi thiết kế ứng dụng, thường cần cho phép một mức độ truy cập đồng thời vào dữ liệu dùng chung, điều này đòi hỏi các biện pháp bảo vệ tính toàn vẹn dữ liệu và tránh các vấn đề phổ biến như lost update (mất cập nhật) và inconsistent read (đọc không nhất quán). Lost update xảy ra khi một tiến trình thực hiện cập nhật lên dữ liệu đã bị một tiến trình khác thay đổi kể từ lần đọc gần nhất, khiến các thay đổi trước đó bị ghi đè.[10]

Về cơ chế Pessimistic Locking ở tầng cơ sở dữ liệu, cơ chế này tận dụng trực tiếp các công cụ của hệ quản trị CSDL để thiết lập quyền truy cập độc quyền một cách chi tiết trên dữ liệu. Nhờ đó, nó đảm bảo không một giao dịch (transaction) nào khác có thể sửa đổi hoặc xóa các dữ liệu đang được giữ (reserved). Quyền khóa độc quyền (exclusive lock) này thường đạt được thông qua câu lệnh SELECT ... FOR UPDATE.[10]

**Liên hệ đề tài:** Nghiệp vụ trừ kho theo FEFO trong module orders/products sử dụng khóa pessimistic_write (tương ứng SELECT ... FOR UPDATE) theo thứ tự cố định (product → batch) để tránh race condition và deadlock khi nhiều nhân viên đồng thời tạo đơn hàng cho cùng sản phẩm

2.1.7. Bảo mật ứng dụng web: Authentication, Authorization và RBAC

**Authentication vs Authorization:** Authentication bảo vệ thông tin khỏi nguy cơ rò rỉ và giám sát tài khoản, trong khi authorization cung cấp cơ chế kiểm soát truy cập tập trung và giảm thiểu nguy cơ vi phạm dữ liệu, đồng thời kiểm soát những gì người dùng có thể xem và thực hiện. Việc triển khai đồng thời hai cơ chế này giúp cải thiện bảo mật tổng thể, nhận diện và giảm thiểu rủi ro, đồng thời đảm bảo người dùng chỉ truy cập được đúng những gì họ cần.[11]

**Access Control Models (RBAC):** Mô hình kiểm soát truy cập mà một ứng dụng áp dụng có nhiệm vụ đánh giá một request đến và đưa ra quyết định cho phép hay từ chối request đó tiếp tục xử lý, dựa trên các yếu tố như danh tính gắn với request, tài nguyên mà request nhắm tới, và thông tin ngữ cảnh của request (thời điểm, múi giờ, phương thức xác thực đã dùng).[11]

**JWT/API-token:** API-token hoạt động tương tự JWT token và được gửi qua header Authorization, sau đó được xử lý bởi API gateway để xác minh danh tính người dùng.[11]

**Liên hệ đề tài: **Hệ thống áp dụng JWT với mô hình access/refresh token (chỉ lưu hash refresh token), kết hợp RBAC theo vai trò admin/leader/cashier thông qua Guard (NestJS) và dependency require_roles (FastAPI); đồng thời chống Mass Assignment bằng whitelist DTO.

2.1.8. Caching và chiến lược ghi dữ liệu

Một cache về cơ bản đóng vai trò facade cung cấp quyền truy cập thuận tiện tới một kho lưu trữ khác, trong đó bộ nhớ cache thường nhanh hơn nhưng đắt đỏ hơn nên có dung lượng hạn chế hơn so với nguồn lưu trữ gốc. Việc lựa chọn chính sách ghi cache (write policy) như ghi trực tiếp và đồng thời vô hiệu hóa dữ liệu cũ khi có cập nhật ảnh hưởng trực tiếp đến việc dữ liệu trả về từ cache có phản ánh đúng trạng thái mới nhất của nguồn dữ liệu gốc hay không.[12]

**Liên hệ đề tài:** Module products áp dụng cache-aside với Redis, trong đó dữ liệu được đọc từ cache khi có, và được chủ động vô hiệu hóa (evict) ngay khi có thao tác ghi (tạo/sửa/xóa sản phẩm, tạo đơn hàng), kèm cơ chế fallback về CSDL khi Redis gặp sự cố.

2.1.11. Xử lý bất đồng bộ (Asynchronous Processing)

Mô hình bất đồng bộ là mô hình cho phép nhiều việc xảy ra cùng lúc khi chương trình gọi một hàm chạy lâu, luồng thực thi không bị chặn lại mà chương trình vẫn tiếp tục chạy. Lập trình bất đồng bộ xoay quanh việc thực thi không chặn (non-blocking) giữa các hàm, và có thể được áp dụng cả trong mô hình đơn luồng lẫn đa luồng do đó đa luồng chỉ là một hình thức của lập trình bất đồng bộ.[13]

**Liên hệ đề tài:** Backend NestJS tận dụng Event Loop đơn luồng của Node.js kết hợp async/await khi thao tác CSDL và gọi API ZaloPay; backend FastAPI sử dụng asyncio kết hợp SQLAlchemy AsyncSession và asyncpg để đảm bảo các thao tác I/O không chặn luồng xử lý các request khác.

2.1.12. Phương pháp quản lý tồn kho FEFO (First-Expired-First-Out)

FEFO (First Expired, First Out) là một thuật ngữ được sử dụng trong quản lý tồn kho hiện trường (field inventory management) để mô tả cách xử lý logistics đối với các sản phẩm có thời hạn sử dụng giới hạn, bao gồm hàng hóa dễ hỏng hoặc hàng tiêu dùng có ngày hết hạn cụ thể theo đó sản phẩm có hạn sử dụng gần nhất sẽ được xuất kho hoặc phục vụ trước. Phương pháp này được sử dụng chủ yếu trong ngành dược phẩm và hóa chất, nơi ngày hết hạn được tính dựa trên ngày hết hạn của lô hàng hoặc thời gian sử dụng còn lại (shelf-life). [15]

Ảnh 3: Ảnh minh hoạ FEFO

FEFO khác với FIFO (First In First Out) ở chỗ FIFO chỉ sắp xếp theo thứ tự ngày nhập kho, trong khi FEFO ưu tiên theo hạn sử dụng thực tế của từng lô hàng điều này quan trọng vì lô hàng nhập sau đôi khi lại có hạn sử dụng ngắn hơn lô nhập trước do biến động trong sản xuất hoặc chuỗi cung ứng. [12]

**Liên hệ đề tài:** Hệ thống hiện thực hóa FEFO qua việc truy vấn và tiêu thụ các lô hàng (product_batches) theo thứ tự expiry_date ASC NULLS LAST, đảm bảo lô hàng sắp hết hạn luôn được xuất bán trước, giảm thiểu rủi ro tồn kho hết hạn.

2.1.13. Hệ thống quản lý cửa hàng tiện lợi

Hệ thống quản lý cửa hàng tiện lợi (Convenience Store Management System – CSMS) là một dạng hệ thống thông tin quản lý chuyên biệt, hướng đến hỗ trợ vận hành các cửa hàng bán lẻ quy mô nhỏ và vừa có tần suất giao dịch cao nhưng danh mục hàng hóa và quy trình nghiệp vụ tương đối chuẩn hóa. Về mặt chức năng, một CSMS điển hình thường bao gồm các phân hệ cốt lõi: (1) quản lý danh mục sản phẩm và tồn kho, bao gồm nhập hàng, kiểm kê định kỳ và điều chỉnh hao hụt; (2) phân hệ điểm bán (Point of Sale – POS) xử lý giao dịch bán hàng với nhiều hình thức thanh toán; (3) quản lý nhân sự theo ca làm việc và đối soát quỹ tiền mặt cuối ca; (4) quản lý khuyến mãi và chương trình giá; (5) báo cáo doanh thu, thống kê phục vụ ra quyết định.

Đặc thù vận hành của loại hình cửa hàng tiện lợi tại Việt Nam nơi khách hàng ưu tiên sự tiện lợi về vị trí, thời gian và tốc độ phục vụ [5] đòi hỏi CSMS phải đảm bảo tốc độ xử lý giao dịch nhanh tại quầy POS, đồng thời duy trì tính chính xác tuyệt đối của dữ liệu tồn kho trong điều kiện nhiều giao dịch diễn ra đồng thời, đặc biệt vào các khung giờ cao điểm.

**Liên hệ đề tài:** Hệ thống thực nghiệm trong tiểu luận hiện thực hóa đầy đủ các phân hệ nêu trên (sản phẩm/tồn kho theo FEFO, POS đa hình thức thanh toán, ca làm việc/đối soát quỹ, khuyến mãi, báo cáo doanh thu) song song trên cả hai nền tảng NestJS và FastAPI, nhằm tạo ra một bối cảnh nghiệp vụ đồng nhất và đủ phức tạp để so sánh khách quan hai công nghệ backend.

2.1.9. Kiểm thử hiệu năng (Performance Testing) và Kiểm thử chịu tải (Load Testing)

Đo lường các chỉ số vận hành của hệ thống (như thời gian phản hồi, thông lượng, mức độ sử dụng tài nguyên) dưới các điều kiện tải giả lập nhằm phát hiện điểm nghẽn (bottleneck) và giới hạn chịu tải của ứng dụng.

**Liên hệ đề tài:** Đánh giá định lượng hiệu năng của NestJS và FastAPI thông qua đo lường các chỉ số Throughput (RPS), Latency (p50, p90, p99), và tỷ lệ lỗi khi tăng quy mô người dùng đồng thời.

2.2 Công nghệ sử dụng trong giải pháp đề xuất

| **Thành phần**          | **NestJS**                      | **FastAPI**                    |
| ----------------------- | ------------------------------- | ------------------------------ |
| Ngôn ngữ                | TypeScript                      | Python                         |
| ORM / Truy xuất dữ liệu | TypeORM                         | SQLAlchemy                     |
| Xác thực / Bảo mật      | Passport.js                     | FastAPI Security               |
| Xử lý bất đồng bộ       | Node.js Event Loop, async/await | asyncio, AsyncSession, asyncpg |
| CSDL quan hệ            | PostgreSQL                      | PostgreSQL                     |
| Caching                 | Redis                           | Redis                          |
| Cổng thanh toán         | ZaloPay API                     | ZaloPay API                    |
| Frontend minh họa       | React                           | React                          |
| Công cụ đo tải          | K6                              | K6                             |

_Bảng **1** Công nghệ sử dụng trong 2 backend thực nghiệm_

2.2.1. NestJs

Nest (NestJS) là một framework giúp xây dựng các ứng dụng phía máy chủ (server-side) bằng Node.js hiệu quả và dễ mở rộng. Framework này sử dụng JavaScript thế hệ mới, được xây dựng hoàn toàn bằng TypeScript và hỗ trợ TypeScript tối đa (nhưng vẫn cho phép các lập trình viên viết bằng JavaScript thuần). Nest là sự kết hợp giữa các trường phái lập trình Lập trình Hướng đối tượng (OOP), Lập trình Hàm (FP) và Lập trình Phản ứng Hàm (FRP).

Bên dưới lớp vỏ (Under the hood), Nest sử dụng các HTTP Server framework mạnh mẽ như Express (mặc định) và cũng có thể tùy chỉnh để dùng Fastify!

Nest cung cấp một lớp trừu tượng (abstraction) bao bọc các Node.js framework phổ biến này, nhưng đồng thời vẫn mở ra các API trực tiếp cho lập trình viên sử dụng. Điều này giúp linh hoạt tận dụng hàng ngàn thư viện thứ ba có sẵn trên nền tảng đó.

2.2.2. FastApi

FastAPI là một web framework hiện đại, tốc độ cao (hiệu năng cao) dùng để xây dựng API với Python, dựa trên các chuẩn khai báo kiểu dữ liệu (type hints) của Python.

Các tính năng cốt lõi:

**Tốc độ cao (Fast):** Hiệu năng rất cao, ngang ngửa với NodeJS và Go (nhờ vào Starlette và Pydantic). Là một trong những framework Python nhanh nhất hiện nay.

**Viết code nhanh (Fast to code):** Tăng tốc độ phát triển tính năng khoảng 200% đến 300%. \*

**Ít lỗi hơn (Fewer bugs): **Giảm khoảng 40% các lỗi do con người (lập trình viên) gây ra. \*

**Trực quan (Intuitive):** Hỗ trợ cực tốt trên các trình soạn thảo code (IDE). Gợi ý/Tự động hoàn thành code ở mọi nơi. Tốn ít thời gian debug hơn.

**Dễ dùng (Easy):** Được thiết kế để dễ sử dụng và dễ học. Tốn ít thời gian đọc tài liệu hơn.

**Ngắn gọn (Short):** Tối thiểu hóa việc trùng lặp code. Tích hợp nhiều tính năng chỉ từ một khai báo tham số. Ít phát sinh lỗi hơn.

**Mạnh mẽ (Robust): **Sẵn sàng cho môi trường thực tế (production). Tự động tạo tài liệu tương tác (interactive documentation).

**Dựa trên các tiêu chuẩn (Standards-based):** Dựa trên (và tương thích hoàn toàn với) các tiêu chuẩn mở dành cho API: OpenAPI (trước đây gọi là Swagger) và JSON Schema.

2.2.3. TypeORM

TypeORM là một ORM có thể chạy trên nhiều nền tảng như Node.js, Browser (Trình duyệt), Cordova, Ionic, React Native, NativeScript, Expo và Electron; đồng thời có thể sử dụng với TypeScript lẫn JavaScript (ES2021).

Mục tiêu của TypeORM là luôn hỗ trợ các tính năng JavaScript mới nhất và cung cấp thêm các tính năng bổ sung giúp phát triển bất kỳ loại ứng dụng nào có sử dụng cơ sở dữ liệu từ các ứng dụng nhỏ chỉ với vài bảng cho đến các ứng dụng doanh nghiệp quy mô lớn sử dụng nhiều cơ sở dữ liệu khác nhau.

TypeORM hỗ trợ nhiều hệ quản trị cơ sở dữ liệu hơn bất kỳ JS/TS ORM nào khác: Google Spanner, Microsoft SqlServer, MongoDB, MySQL/MariaDB, Oracle, Postgres, SAP HANA và SQLite, cũng như các cơ sở dữ liệu biến thể và các driver khác nhau.

Không giống như tất cả các JavaScript ORM hiện có khác, TypeORM hỗ trợ cả hai mô hình Active Record và Data Mapper. Điều này đồng nghĩa với việc lập trình viên có thể viết nên các ứng dụng chất lượng cao, giảm thiểu sự phụ thuộc (loosely coupled), dễ mở rộng và dễ bảo trì theo cách tối ưu năng suất nhất.

TypeORM chịu ảnh hưởng mạnh mẽ từ các ORM nổi tiếng khác như Hibernate, Doctrine và Entity Framework.

**Trong đề tài\*\***:\*\* TypeORM được dùng để ánh xạ các entity nghiệp vụ sang PostgreSQL và hiện thực cơ chế khóa pessimistic_write đã trình bày ở mục 2.1.6.

2.2.4. SQLAlchemy

SQLAlchemy là một bộ công cụ SQL và ORM (Object Relational Mapper) dành cho Python, mang lại cho các nhà phát triển ứng dụng toàn bộ sức mạnh và sự linh hoạt của SQL.

Nó cung cấp trọn bộ các mô hình lưu trữ dữ liệu (persistence patterns) cấp doanh nghiệp nổi tiếng, được thiết kế để truy xuất cơ sở dữ liệu hiệu quả, đạt hiệu năng cao và được tối ưu theo phong cách viết code đơn giản, chuẩn Python (Pythonic).

**Trong đề tài\*\***:\***\* **SQLAlchemy được sử dụng ở chế độ bất đồng bộ (AsyncSession) kết hợp driver asyncpg, phù hợp với mô hình ASGI của FastAPI đã trình bày ở mục 2.1.2.

2.2.5. Passport.js

Passport.js là một middleware xác thực (authentication middleware) cho Node.js, có thể dễ dàng tích hợp vào bất kỳ ứng dụng web nào dựa trên Express.

**Đặc điểm chính:**

Nhiệm vụ duy nhất của Passport là xác thực các request, thông qua một tập hợp plugin có thể mở rộng gọi là "strategies" (chiến lược).

Passport không tự tạo route hay giả định bất kỳ schema database cụ thể nào, giúp tối đa hóa tính linh hoạt và để nhà phát triển tự quyết định ở tầng ứng dụng.

API rất đơn giản: Cung cấp cho Passport một request để xác thực, và Passport cung cấp các hook để kiểm soát điều gì xảy ra khi xác thực thành công hoặc thất bại.

Passport.js thường được dùng kèm với NestJS (qua package @nestjs/passport) để xử lý xác thực (JWT, Local, OAuth...)

**Trong đề \*\***tài:\*\* Passport.js được sử dụng với JWT Strategy (tích hợp qua @nestjs/passport) để xác thực access token theo cơ chế đã trình bày ở mục 2.1.7.

2.2.6. **FastAPI Security**

FastAPI Security là module bảo mật tích hợp sẵn trong FastAPI (fastapi.security), giúp xử lý xác thực (authentication) và ủy quyền (authorization) cho API.

**Kiến trúc:**

Hệ thống bảo mật của FastAPI được xây dựng dựa trên các lớp security scheme có thể tái sử dụng, hoạt động như các dependency có thể inject được.

Tất cả security scheme đều kế thừa từ SecurityBase và tự động sinh tài liệu OpenAPI (Swagger).

Bao gồm OAuth2, HTTP authentication (Basic, Bearer, Digest), API Key authentication, và OpenID Connect.

**Cơ chế phổ biến nhất: OAuth2 + JWT**

JWT là phương pháp chuẩn để xác thực bearer token không trạng thái (stateless) trong FastAPI.

OAuth2PasswordBearer chỉ trích xuất chuỗi token thô từ header Authorization: Bearer <token> nó không tự validate nội dung token; việc validate là trách nhiệm của một dependency downstream gọi jwt.decode().

Việc xử lý JWT và hash mật khẩu cần các thư viện bên ngoài FastAPI FastAPI khuyến nghị dùng pwdlib (hash mật khẩu) và PyJWT (xử lý JWT).

**Trong đề tài:** Fastapi sercurity được sử dụng để để tự động trích xuất và kiểm tra JWT Bearer Token, phục vụ xác thực người dùng và phân quyền dựa trên vai trò (RBAC) đối với các nghiệp vụ nhạy cảm của cửa hàng tiện lợi.

2.2.7. **PostgreSQL**

PostgreSQL là một hệ quản trị cơ sở dữ liệu quan hệ-hướng đối tượng mã nguồn mở, sử dụng và mở rộng ngôn ngữ SQL kết hợp nhiều tính năng giúp lưu trữ và mở rộng an toàn cho các khối lượng dữ liệu phức tạp.

**Trong đề tài\*\***:\*\* PostgreSQL đóng vai trò hệ quản trị CSDL quan hệ chính, đảm bảo tính toàn vẹn ACID cho các giao dịch tài chính, lưu kho FEFO và đối soát ca như đã trình bày ở phần Phạm vi nghiên cứu.

2.2.8. **Redis**

Redis là một kho lưu trữ cấu trúc dữ liệu trên bộ nhớ trong (in-memory), mã nguồn mở, được sử dụng làm cơ sở dữ liệu, bộ nhớ đệm (cache), trình môi giới tin nhắn (message broker) và công cụ xử lý luồng dữ liệu (streaming engine). Redis mang lại độ trễ dưới 1 miligiây, hỗ trợ nhiều kiểu dữ liệu phong phú (String, Hash, List, Set, Sorted Set, Stream, JSON, Vector Set) và có thể mở rộng theo chiều ngang nhờ Redis Cluster. Ngoài ra, Redis còn hỗ trợ tìm kiếm vector cho các ứng dụng GenAI (AI tạo sinh), bao gồm tìm kiếm theo ngữ nghĩa (semantic search), RAG và các hệ thống gợi ý. Redis hoàn toàn miễn phí, có thể chạy ở bất kỳ đâu và cung cấp tùy chọn dịch vụ quản lý hạ tầng thông qua Redis Cloud.

**Trong đề tài\*\***:\*\* Redis được sử dụng làm tầng cache-aside cho module products, quản lý session/token ca làm việc, và hỗ trợ khóa phân tán (Distributed Lock) để xử lý race-condition tồn kho như đã trình bày ở mục 2.1.8.

**2.2.\*\***9\***\*. \*\***Docker\*\*

Docker là một nền tảng mở dành cho việc phát triển, đóng gói và vận hành ứng dụng. Docker cho phép tách biệt ứng dụng khỏi hạ tầng bên dưới, nhờ đó có thể phân phối phần mềm một cách nhanh chóng. Với Docker, lập trình viên có thể quản lý hạ tầng theo cùng một cách mà lập trình viên quản lý các ứng dụng của mình. Bằng cách tận dụng các phương pháp đóng gói, thử nghiệm và triển khai mã nguồn của Docker, lập trình viên có thể giảm đáng kể khoảng thời gian từ lúc viết code cho đến khi đưa nó vào chạy thực tế (production).

Docker mang lại khả năng đóng gói và chạy ứng dụng trong một môi trường được cô lập tương đối gọi là container (thùng chứa). Sự cô lập và tính bảo mật này cho phép chạy nhiều container cùng một lúc trên một máy chủ (host).

Các container rất nhẹ vì chúng đã chứa sẵn mọi thứ cần thiết để ứng dụng hoạt động, giúp lập trình viên không phải phụ thuộc vào những gì đã được cài đặt trên máy chủ. Lập trình viên có thể chia sẻ các container trong quá trình làm việc và hoàn toàn yên tâm rằng bất kỳ ai nhận được container đó cũng sẽ chạy nó theo đúng một cách giống hệt nhau.

Docker cung cấp cả bộ công cụ lẫn nền tảng để quản lý toàn bộ vòng đời của các container:

Phát triển ứng dụng và các thành phần bổ trợ bằng cách sử dụng container.

Container trở thành đơn vị chuẩn để phân phối và kiểm thử ứng dụng.

Khi đã sẵn sàng, triển khai ứng dụng vào môi trường thực tế (production) dưới dạng một container hoặc một dịch vụ được điều phối (orchestrated service). Quy trình này hoạt động hoàn toàn giống nhau, cho dù môi trường thực tế là trung tâm dữ liệu nội bộ (local data center), nhà cung cấp dịch vụ đám mây (cloud provider), hay mô hình kết hợp cả hai (hybrid).

Trong đề tài, Docker được dùng để containerize PostgreSQL và Redis, đảm bảo cả hai backend NestJS và FastAPI được đánh giá trên cùng một môi trường hạ tầng lưu trữ đồng nhất, dễ dàng khởi tạo lại và loại trừ sai lệch do khác biệt cấu hình máy chủ.

**2.2.\*\***10\***\* \*\***ZaloPay Open API\*\*

ZaloPay Open API là bộ API cổng thanh toán do ZaloPay cung cấp cho đối tác (merchant) tích hợp hình thức thanh toán điện tử vào hệ thống của mình; theo tài liệu chính thức, khi merchant server gửi yêu cầu tạo đơn hàng đến ZaloPay server, ZaloPay server sẽ trả về một đường dẫn (order_url) để chuyển hướng người dùng đến trang cổng thanh toán, và nếu merchant server chưa nhận được callback thông báo kết quả trong vòng 15 phút kể từ khi tạo đơn hàng, merchant cần chủ động gọi API truy vấn trạng thái để lấy kết quả cuối cùng.

**Trong đề tài\*\***:\*\* ZaloPay API được tích hợp vào module orders nhằm xử lý hình thức thanh toán chuyển khoản điện tử tại quầy POS, cạnh các hình thức tiền mặt và thẻ.

2.2.11 K6

k6 là công cụ kiểm thử hiệu năng (performance testing) và kiểm thử chịu tải (load testing) mã nguồn mở hiện đại, hiệu năng cao được phát triển bởi Grafana.

**Đặc điểm chính:**

Nhiệm vụ duy nhất của k6 là đo lường hiệu năng và chịu tải của hệ thống, thông qua việc giả lập lượng lớn người dùng ảo (Virtual Users - VUs).

Kịch bản kiểm thử được lập trình bằng JavaScript, cho phép nhà phát triển xây dựng các tình huống mô phỏng hành vi người dùng cực kỳ linh hoạt và tái sử dụng mã nguồn hiệu quả.

Tối ưu hóa tài nguyên phần cứng vượt trội so với các công cụ truyền thống (như Apache JMeter) nhờ mô hình đa luồng chạy các Virtual Users (VUs) độc lập dưới dạng Goroutines của Go.

k6 thường được sử dụng trong các hệ thống Cloud-native để đo lường các chỉ số như Throughput (RPS), Latency (p50, p90, p99) và phát hiện các điểm nghẽn (bottleneck).

**Trong đề tài:** k6 được sử dụng để thiết lập các kịch bản kiểm thử (luồng tra cứu sản phẩm cache-aside, race-condition giao dịch FEFO, stress test) nhằm đo lường định lượng và đối chiếu trực tiếp hiệu năng xử lý của NestJS và FastAPI dưới các cấp độ tải đồng thời.

CHƯƠNG 3. GIẢI PHÁP CHO BÀI TOÁN/VẤN ĐỀ/MÔ HÌNH

3.1. Phát biểu mô hình/bài toán trong đề tài

3.1.1. Bối cảnh thực tiễn và đặc thù của Hệ thống Quản lý Cửa hàng Tiện lợi

Cửa hàng tiện lợi (Convenience Store) hoạt động với tần suất giao dịch cao, mặt hàng đa dạng và yêu cầu xử lý tức thời tại quầy POS. Hệ thống có các bài toán đặc thù sau:

Tần suất giao dịch liên tục & Độ trễ thấp (High Throughput & Low Latency): Quét mã vạch, kiểm tra giá, tính khuyến mãi và thanh toán (Tiền mặt / QR ZaloPay) yêu cầu thời gian phản hồi Backend < 100 ms.

Quản lý tồn kho đa lô (product_batches) & FEFO (First Expired, First Out): Hàng thực phẩm/tiêu dùng có hạn dùng ngắn, bắt buộc ưu tiên xuất lô hết hạn trước.

Định giá động theo hạn sử dụng (Expiry Dynamic Pricing): Tự động hạ giá bán cho các lô hàng tiệm cận ngày hết hạn để xả hàng, giảm tỷ lệ hủy hàng.

Kiểm kê kho & Trả hàng chính xác theo từng lô (stocktake_item_batches): Khắc phục triệt để lỗi bù trừ mù/dồn vào lô đầu tiên khi kiểm kê hoặc hoàn kho.

Quản lý ca bán hàng (shifts) & Đối soát két tiền: Kiểm soát tiền đầu ca (C_start), doanh thu tiền mặt (C_cash_sales), nạp/rút tiền và đối soát số tiền thực tế khi chốt ca (C_actual_counted).

3.1.2. Mô hình Toán học và Hình thức hóa Bài toán Nghiệp vụ

**Mô hình Phân bổ Tiêu thụ Lô hàng theo FEFO (FEFO Inventory Allocation Model)**

Cho tập các lô hàng khả dụng của sản phẩm p:

Bp={b1,b2,…,bk}

Xếp theo ngày hết hạn:

E1≤E2 ≤…≤Ek

Khi khách mua số lượng Qorder, bài toán phân bổ trừ kho Δqi trên từng lô bi = (idi, qi, Ei) xác định theo:

i=1kΔqi=Qorder,0≤Δqi≤qi,∀i=1,…,k

Hàm mục tiêu ưu tiên FEFO (ưu tiên trừ trước ở lô có hạn sử dụng gần nhất, tức chỉ số i nhỏ):

mini=1ki·Δqi

**Mô hình Chiết khấu Tự động theo Hạn sử dụng (Expiry Pricing Model)**

Thời gian còn lại của lô bi:

ΔTi= E(bi) −tcurrent

Hàm tính giá bán lô bi:

| **Điều kiện**        | **Giá bán P(p, **bi**, **tcurrent**)** |
| -------------------- | -------------------------------------- |
| ΔTi ≤, Tthreshold, m | Pbase(p) × (1 −δm)                     |
| ΔTi > Tthreshold, 1  | Pbase(p)                               |

Bảng 2. Công thức tính giá bán lô bi* và điều kiện*

Mô hình Đối soát Tài chính Ca làm việc (Shift Financial Reconciliation Model)

Số tiền hệ thống kỳ vọng khi chốt ca:

Csystem_expected=Cstart+Ccash_sales+Cin−Cout

Chênh lệch tiền mặt khi chốt ca:

Δcash=Cactual_counted−Csystem_expected

3.1.3. Mô hình Đánh giá So sánh Backend (NestJS vs FastAPI)

Đề tài xác định Mô hình đánh giá so sánh dựa trên 3 nhóm tiêu chí chính:

Tốc độ phát triển & cấu hình ban đầu: Thời gian phát triển, dung lượng mã nguồn (LOC), mức độ rườm rà (boilerplate code) và tính dễ bảo trì.

Hiệu năng API: Thời gian phản hồi (Latency p50, p90, p99), số lượng request/giây (Throughput/RPS) và tỷ lệ lỗi dưới tải xử lý đồng thời.

Khả năng quản lý dữ liệu & bảo mật: Kiểm soát giao dịch CSDL (Transaction / Race-condition trong tồn kho), cơ chế xác thực JWT/RBAC, chống Mass Assignment và độ ổn định khi cache-aside qua Redis.

3.2. Giải pháp cụ thể để giải quyết mô hình / bài toán

Để giải quyết triệt để bài toán nghiệp vụ cửa hàng tiện lợi và thực hiện so sánh khoa học giữa NestJS và FastAPI, đề tài đề xuất giải pháp tổng thể bao gồm Kiến trúc Hệ thống, Giải pháp Thuật toán Nghiệp vụ và Giải pháp Triển khai Backend Song song (Parity Implementation).

3.2.1. Kiến trúc tổng thể của hệ thống (Overall System Architecture)

Giải pháp được tổ chức theo kiến trúc 3 lớp (3-Tier Architecture) kết hợp mô hình Dual Backend được đóng gói hoàn toàn trong môi trường Docker Containers (Docker Compose), đảm bảo tính tách biệt tài nguyên và môi trường kiểm thử thực nghiệm công bằng giữa NestJS và FastAPI:

Ảnh 4: Kiến trúc hệ thống.

Lớp Giao diện (Presentation Layer): Ứng dụng ReactJS SPA duy nhất dùng chung, kết nối thẳng tới 1 trong 2 backend thông qua biến môi trường `VITE_API_BASE_URL`. Phục vụ toàn bộ luồng nghiệp vụ tại quầy POS: quét mã vạch sản phẩm, tính giá cận date, thanh toán ZaloPay, chốt ca và kiểm kê lô hàng.

Lớp Backend Kép (Dual Backend Layer): Hai hệ thống backend được xây dựng song song độc lập, mỗi backend đóng gói thành Docker Container riêng và triển khai trên cổng (Port) khác nhau. Cả hai tuân theo cùng kiến trúc phân lớp nội bộ: Controller/Router → Service → Repository/CRUD → Database. Sự khác biệt nằm ở ngôn ngữ, framework và ORM được sử dụng:

NestJS Container (Port 3000): Node.js v20, TypeScript v5.5, NestJS v10 với TypeORM v0.3, kiến trúc Module-Controller-Service có Dependency Injection.

FastAPI Container (Port 8000): Python 3.11, FastAPI v0.110+ với SQLAlchemy v2.0 AsyncSession + asyncpg, kiến trúc Router-Service-CRUD với Pydantic v2 validation.

Lớp Lưu trữ (Data Layer): Mỗi backend có tầng dữ liệu độc lập hoàn toàn để đảm bảo môi trường thực nghiệm sạch, không bị ảnh hưởng chéo:

PostgreSQL 16 (CSDL quan hệ ACID): `db_nestjs` (Port 5433) cho NestJS và `db_fastapi` (Port 5434) cho FastAPI.

Redis 7 (In-memory Cache & Distributed Locking): `redis_nestjs` (Port 6380) và `redis_fastapi` (Port 6381).

3.2.2. Giải pháp Chi tiết cho các Bài toán Nghiệp vụ

Giải pháp Thuật toán FEFO & Database Transactions: Sử dụng BEGIN TRANSACTION và SELECT ... FOR UPDATE truy vấn các lô quantity > 0, ưu tiên ORDER BY expiry_date ASC. Khấu trừ từng lô và lưu chi tiết vào order_item_batches.

Giải pháp Kiểm kê Chi tiết theo Lô (stocktake_item_batches): Mở rộng bảng stocktake_item_batches ghi nhận counted_quantity và system_quantity trên từng batch_id. Cập nhật chính xác lô bị lệch thay vì gọi FEFO dồn bù trừ mù.

Giải pháp Hoàn kho Đơn hàng Trả (Return Order Restoration): Truy vấn ngược bảng order_item_batches để trả số lượng về đúng lô ban đầu xuất bán.

Giải pháp Quản lý Ca (shifts) & Tích hợp ZaloPay: Gắn shift_id vào mọi giao dịch POS, hỗ trợ tạo QR thanh toán ZaloPay động với chữ ký bảo mật HMAC-SHA256.

3.2.3. So sánh Giải pháp Kỹ thuật Cài đặt (NestJS vs FastAPI)

| **Tiêu chí**       | **Giải pháp cài đặt trên NestJS**       | **Giải pháp cài đặt trên FastAPI**            |
| ------------------ | --------------------------------------- | --------------------------------------------- |
| Ngôn ngữ & Runtime | TypeScript, Node.js (V8 Engine)         | Python 3.11+, AsyncIO (Uvicorn ASGI)          |
| Cấu trúc Dự án     | Modular Architecture (@Module), OOP, DI | Package-based, Decorators, Light DI (Depends) |
| ORM / Database     | TypeORM / Prisma ORM                    | SQLAlchemy 2.0 Async Session                  |
| Validation Dữ liệu | class-validator + class-transformer     | Pydantic v2 (Rust core validator)             |
| Thanh toán ZaloPay | Dynamic HMAC-SHA256 Sign Module         | Python hashlib + hmac module                  |

Bảng 3. Bảng So sánh Giải pháp Kỹ thuật Cài đặt (NestJS vs FastAPI)

3.2.4. Kịch bản Đánh giá Thực nghiệm (Benchmark Methodology)

Để đảm bảo tính khách quan và khoa học khi so sánh NestJS và FastAPI ở Chương 4, kịch bản đánh giá thực nghiệm được thiết kế toàn diện theo 2 nhóm phương pháp: Đánh giá định lượng (Hiệu năng & Tài nguyên) và Đánh giá định tính (Trải nghiệm lập trình & Độ phức tạp mã nguồn).

- **Môi trường Đóng gói \*\***&\***\* Hạ tầng Kiểm thử**

Containerization: Cả 2 backend (NestJS, FastAPI) và CSDL (PostgreSQL v16, Redis v7) được đóng gói qua Docker Compose, giới hạn phần cứng tương đồng (cpus: '2.0', memory: '2GB').

Công cụ đo tải: Sử dụng K6 (hoặc Locust) chạy từ một máy client độc lập trong cùng mạng nội bộ để loại bỏ ảnh hưởng của độ trễ mạng Internet.

- **Các Kịch bản Kiểm thử Nghiệp vụ (Test Scenarios)**

Kịch bản 1. Micro-benchmark API Đơn lẻ (Read-Heavy / Caching Test):

Hành vi: Giả lập các quầy POS liên tục quét mã vạch tra cứu thông tin sản phẩm và giá bán (GET /api/products/barcode/{code}).

Mục tiêu: Đánh giá khả năng xử lý I/O cơ bản và hiệu quả của chiến lược Caching (Redis Cache-aside).

Kịch bản 2. Luồng Bán hàng POS & Trừ kho FEFO (Transaction & Race-Condition Test):

Hành vi: Giả lập đồng thời nhiều thu ngân tạo đơn hàng (POST /api/orders) gồm 3–5 sản phẩm có nhiều lô hàng khác nhau. Mỗi request thực thi chuỗi giao dịch ACID: mở Transaction → khóa dòng SELECT ... FOR UPDATE → phân bổ trừ kho FEFO → tính chiết khấu cận date → ghi nhận order_item_batches → sinh chữ ký thanh toán ZaloPay HMAC-SHA256.

Mục tiêu: Đánh giá khả năng quản lý khóa giao dịch CSDL, tỷ lệ xung đột/lỗi (Lock Timeout / Transaction Rollback) và tốc độ phản hồi dưới áp lực tranh chấp dữ liệu cao.

Kịch bản 3. Luồng Chốt Ca & Báo cáo Tài chính (Complex Aggregate Query Test):

Hành vi: Giả lập chốt ca bán hàng (POST /api/shifts/{id}/close) và truy vấn báo cáo doanh thu theo chi nhánh.

Mục tiêu: Đánh giá hiệu năng xử lý các câu lệnh tính toán tổng hợp (Aggregation Queries) trên ORM (TypeORM vs SQLAlchemy AsyncSession).

Kịch bản 4. Thử nghiệm Tải Tới hạn (Stress Test & Saturation Test):

Hành vi: Tăng dần số lượng người dùng ảo (Virtual Users - VUs) từ 5 đến 10 VUs trong thời gian 10 phút.

Mục tiêu: Xác định điểm gãy (Break-point) và ngưỡng sụt giảm hiệu năng (Latency Spikes / Memory Leak) của Node.js Event Loop (NestJS) và Python asyncio/Uvicorn (FastAPI).

- **Bộ Tiêu chí và Chỉ số Đo lường (Evaluation Metrics)**

Định lượng:

Throughput (RPS): Số lượng yêu cầu xử lý thành công trên mỗi giây.

Latency Percentiles: Thời gian phản hồi tại các mốc p50, p90, p95, p99 và thời gian phản hồi tối đa (Max Latency).

Resource Consumption: Tỷ lệ sử dụng CPU (%), bộ nhớ RAM chiếm dụng (MB) thu thập real-time qua docker stats.

Error & Rollback Rate: Tỷ lệ HTTP 5xx và số giao dịch bị rollback do lỗi khóa CSDL.

**C \*\***Định tính (Developer Experience - DX):\*\*

Số dòng code (SLOC) và mức độ rườm rà (Boilerplate code).

Độ an toàn kiểu dữ liệu (Compile-time Type Safety ở NestJS/TypeScript vs Runtime Data Validation ở FastAPI/Pydantic).

Tốc độ khởi động dịch vụ (Cold Start Time) và độ phức tạp khi mở rộng module mới.

CHƯƠNG 4. HIỆN THỰC GIẢI PHÁP

- 4.1. Môi trường triển khai thực nghiệm
  4.1.1. Cấu hình phần cứng máy chủ thực nghiệm (Docker Host)

Hạ tầng phần cứng chạy các container backend và cơ sở dữ liệu được thiết lập trên máy chủ kiểm thử vật lý với thông số chi tiết như sau:

**Bộ vi xử lý (CPU):** AMD Ryzen 7 7435HS (8 nhân, 16 luồng, xung nhịp cơ bản 3.1 GHz, tăng tốc tối đa 4.5 GHz, bộ nhớ đệm 16MB L3) trên laptop ASUS TUF Gaming A15.

**Bộ nhớ trong (RAM):** 16 GB DDR5 Dual-Channel, tốc độ bus 4800 MHz.

**Ổ đĩa lưu trữ (SSD):** 512 GB SSD NVMe M.2 PCIe Gen 4x4 (tốc độ đọc tuần tự lên đến 3500 MB/s, ghi tuần tự 3000 MB/s).

**Hệ điều hành:** Windows 11 Home 64-bit, kết hợp với hệ thống con Linux WSL2 chạy nhân Ubuntu 22.04 LTS để đảm bảo Docker Engine hoạt động hiệu quả nhất.

4.1.2. Môi trường phần mềm và Cấu hình Docker Container

Cả hai backend và các dịch vụ đi kèm đều được container hóa thông qua Docker (Docker Engine v29.6.1, Docker Compose v5.3.0). Việc container hóa giúp phân tách độc lập tài nguyên và giới hạn phần cứng tương đồng cho mỗi framework:

**Phân bổ tài nguyên ứng dụng (Resource Limits):** Mỗi container chạy ứng dụng backend (NestJS và FastAPI) được giới hạn cứng tài nguyên hệ thống thông qua các cấu hình của Docker Compose: giới hạn CPU cpus: '2.0' (tương đương tối đa 2 vCPU của máy chủ vật lý) và giới hạn RAM memory: '2GB' (tương đương tối đa 2 Gigabyte RAM, không có bộ nhớ Swap bổ sung).

**Ánh xạ cổng kết nối trực tiếp (Port Mapping):** Để loại bỏ độ trễ và sự phức tạp của tầng Proxy trung gian (như Nginx), các container được ánh xạ trực tiếp ra cổng của Docker Host: Backend NestJS App trên cổng 3000:3000 (truy cập qua http://localhost:3000) và Backend FastAPI App trên cổng 8000:8000 (truy cập qua http://localhost:8000).

**4.1.3. Cấu hình Cơ sở dữ liệu và Caching (PostgreSQL \*\***&\***\* Redis)**

Để tránh ảnh hưởng chéo về mặt dữ liệu, mỗi backend được cấu hình kết nối tới các container cơ sở dữ liệu và caching độc lập hoàn toàn, tuy nhiên cấu hình cài đặt bên trong container là giống hệt nhau:

**Hệ quản trị CSDL PostgreSQL 16:** Sử dụng phiên bản container postgres:16-alpine. Database của NestJS tên là store_nestjs (ánh xạ cổng Host 5433:5432, sử dụng driver pg kết hợp TypeORM) và database của FastAPI tên là store_fastapi (ánh xạ cổng Host 5434:5432, sử dụng driver asyncpg kết hợp SQLAlchemy AsyncSession).

**Tầng lưu trữ tạm thời Redis 7:** Sử dụng phiên bản container redis:7-alpine. Caching của NestJS chạy trên container redis_nestjs (cổng Host 6380:6379) và caching của FastAPI chạy trên container redis_fastapi (cổng Host 6381:6379).

**4.1.4. Môi trường đo tải và thu thập số liệu (k6 Client)**

Công cụ đo tải k6 (phiên bản v0.51.0) được triển khai chạy từ môi trường máy chủ vật lý (Docker Host OS) hoặc từ một máy client độc lập kết nối trực tiếp qua mạng nội bộ LAN. Việc chạy k6 bên ngoài container của ứng dụng giúp:

Đảm bảo tiến trình giả lập người dùng ảo (VUs) của k6 không chiếm dụng tài nguyên tính toán (CPU, RAM) được cấp phát riêng cho các container backend.

Đo lường chính xác thời gian phản hồi thực tế (End-to-End Latency), bao gồm cả độ trễ mạng nội bộ vốn ổn định ở mức dưới 1 ms.

Số liệu đo đạc (Throughput, Latency p50, p90, p99, Error rate) được k6 ghi nhận trực tiếp và xuất ra định dạng JSON/CSV phục vụ cho việc thống kê và trực quan hóa kết quả thực nghiệm tại Chương 5.

- 4.2. Mô tả chương trình

Hệ thống Quản lý Cửa hàng Tiện lợi Mini được xây dựng theo kiến trúc Client-Server, trong đó tầng giao diện (Client) và tầng xử lý nghiệp vụ (Server) được tách biệt hoàn toàn và giao tiếp với nhau qua giao thức HTTP/REST. Phía Client là một ứng dụng ReactJS SPA (Single Page Application) dùng chung duy nhất, có khả năng kết nối tới một trong hai backend thông qua biến môi trường cấu hình (VITE_API_BASE_URL), cho phép chuyển đổi backend thử nghiệm mà không cần thay đổi mã nguồn giao diện. Phía Server, mỗi backend (NestJS và FastAPI) đều được tổ chức nội bộ theo kiến trúc phân lớp 3 tầng (3-Layer Architecture) đã trình bày ở mục 2.1.1:

**Presentation Layer (Controller/Router):** tiếp nhận request từ client, thực hiện xác thực đầu vào (DTO/Pydantic Schema) và định tuyến tới tầng Service tương ứng.

**Business Logic Layer (Service):** hiện thực toàn bộ quy tắc nghiệp vụ (FEFO, đối soát ca, tính giá cận date, xử lý thanh toán ZaloPay, hoàn kho theo lô…), độc lập với framework HTTP bên ngoài.

**Data Access Layer (Repository/CRUD):** thao tác trực tiếp với PostgreSQL thông qua ORM (TypeORM ở NestJS, SQLAlchemy AsyncSession ở FastAPI) và với Redis cho các thao tác cache/khóa phân tán.

**Tính thống nhất nghiệp vụ giữa hai backend (Business Logic Parity):**
Để đảm bảo tính khách quan khi so sánh, hai backend không được thiết kế độc lập tùy ý mà tuân theo **cùng một API Contract** (cùng endpoint, cùng cấu trúc request/response, cùng mã lỗi HTTP) và **cùng một thiết kế schema** dữ liệu logic trên PostgreSQL. Cụ thể, mỗi backend sở hữu một cơ sở dữ liệu vật lý riêng biệt và hoàn toàn độc lập (db_nestjs và db_fastapi như đã trình bày ở mục 4.1.3), nhưng hai schema này được thiết kế giống hệt nhau về cấu trúc bảng, tên cột, kiểu dữ liệu, khóa chính/khóa ngoại và ràng buộc toàn vẹn (ví dụ: bảng products, product_batches, orders, order_item_batches, shifts, stocktake_item_batches đều có cấu trúc đồng nhất ở cả hai phía). Việc tách biệt vật lý nhưng đồng nhất logic này nhằm hai mục tiêu:

**Loại trừ nhiễu chéo (cross-contamination):** tránh việc một backend ghi/đọc dữ liệu ảnh hưởng đến kết quả đo hiệu năng của backend còn lại trong quá trình chạy k6.

**Đảm bảo công bằng khi so sánh:** vì cấu trúc dữ liệu và ràng buộc là như nhau, sự khác biệt đo được (hiệu năng, độ phức tạp mã nguồn, tài nguyên tiêu thụ...) chỉ đến từ bản thân framework, ORM và ngôn ngữ lập trình, chứ không bị nhiễu bởi khác biệt thiết kế dữ liệu.

Nhờ vậy, cả hai backend cùng hiện thực đúng một tập quy tắc nghiệp vụ trên nền dữ liệu tương đương nhau, bao gồm: cùng thuật toán phân bổ trừ kho FEFO (ORDER BY expiry_date ASC, khóa pessimistic_write theo thứ tự product → batch); cùng công thức chiết khấu tự động theo hạn sử dụng (Expiry Dynamic Pricing); cùng mô hình đối soát tài chính ca làm việc (C_start, C_cash_sales, C_actual_counted); và cùng luồng thanh toán ZaloPay (tạo chữ ký HMAC-SHA256, xử lý callback/webhook).

**Cơ chế bảo mật riêng của từng backend:**

NestJS: sử dụng **Passport.js **(tích hợp qua package **@nestjs/passport**) với** JWT Strategy** để xác thực access token; việc phân quyền theo vai trò (admin/leader/cashier) được hiện thực thông qua **Guard (AuthGuard, RolesGuard) **kết hợp decorator tùy biến (@Roles()). Dữ liệu đầu vào được kiểm tra bằng **class-validator** và làm sạch (loại bỏ trường thừa) bằng **class-transformer **nhằm chống Mass Assignment. Mô hình access/refresh token chỉ lưu hash của refresh token trong CSDL để giảm rủi ro khi bị lộ.

FastAPI: sử dụng module **FastAPI Security **(fastapi.security), cụ thể là **OAuth2PasswordBearer **để trích xuất Bearer Token từ header **Authorization**. Việc giải mã và xác thực nội dung JWT được thực hiện thủ công qua thư viện **PyJWT **trong một dependency downstream, mật khẩu được băm bằng **pwdlib**. Phân quyền theo vai trò được hiện thực dưới dạng dependency tái sử dụng **require_roles(...)**, còn việc kiểm tra dữ liệu đầu vào/đầu ra dựa hoàn toàn vào **Pydantic v2** (schema validation tại tầng Router).

Nhờ hai backend cùng đạt được mục tiêu bảo mật tương đương (JWT stateless, RBAC theo vai trò, chống Mass Assignment) nhưng bằng công cụ và triết lý khác nhau (Guard/Decorator theo hướng khai báo tập trung ở NestJS so với Dependency Injection linh hoạt ở FastAPI), đề tài có cơ sở để đánh giá định tính về độ phức tạp mã nguồn và trải nghiệm lập trình viên (Developer Experience) giữa hai nền tảng.

**Về mặt chức năng, hệ thống vận hành xoay quanh 3 trụ cột chính:**

Bán hàng & Thanh toán tại quầy (POS Checkout)

**Bán hàng nhanh:** Nhân viên thu ngân quét mã vạch (barcode) để tra cứu thông tin sản phẩm và đưa vào giỏ hàng.

**Tự động áp dụng giá cận hạn: **Hệ thống tự phát hiện sản phẩm sắp hết hạn và áp dụng chính sách giảm giá tự động (ví dụ: hàng còn 3 ngày hết hạn thì giảm 30%) để kích cầu, giải phóng hàng tồn.

**Khuyến mãi:** Áp dụng các chương trình giảm giá theo mã coupon dựa trên giá trị đơn hàng.

**Thanh toán hiện đại:** Hỗ trợ thanh toán truyền thống (tiền mặt) và thanh toán số:Tích hợp thanh toán qua ZaloPay (quét QR động và nhận phản hồi giao dịch tự động qua Webhook).

**Trả hàng \*\***&\***\* Hoàn tiền:** Hỗ trợ khách hàng trả lại một phần hoặc toàn bộ đơn hàng, tự động tính số tiền hoàn trả thực tế và hoàn trả sản phẩm vào đúng lô hàng ban đầu trong kho.

Quản lý Vận hành & Ca làm việc (Shifts Control)

Kiểm soát dòng tiền tại quầy thu ngân thông qua cơ chế **mở/đóng ca làm việc.**

Nhân viên thu ngân khai báo tiền mặt ban đầu khi nhận ca.

Khi kết thúc ca, nhân viên nhập số tiền mặt thực tế đếm được. Hệ thống sẽ tự đối chiếu với số tiền bán hàng ghi nhận trên phần mềm để tính toán chênh lệch thừa/thiếu, giúp chủ cửa hàng phát hiện ngay nếu có thất thoát tiền mặt hoặc sai sót trong quá trình thối tiền cho khách.

Quản lý Kho thông minh & Kiểm kê (FEFO Inventory & Stocktake)

**Xuất kho thông minh (FEFO):** Khi tạo đơn hàng, hệ thống tự động bốc sản phẩm từ lô hàng có hạn sử dụng gần nhất ra bán trước (hết hạn trước - xuất trước) để tối ưu hóa tồn kho, giảm tỷ lệ hàng hỏng hủy.

**Nhập kho \*\***&\***\* Điều chỉnh kho:** Quản lý nhập lô hàng mới (ghi nhận giá vốn, ngày hết hạn) và hỗ trợ điều chỉnh kho thủ công khi có hàng hỏng, hàng mất mát kèm lý do rõ ràng.

**Cảnh báo thông minh**: Hệ thống chủ động hiển thị danh sách sản phẩm dưới ngưỡng an toàn (sắp hết hàng) hoặc sản phẩm sắp đến ngày hết hạn để nhân viên kịp thời bổ sung hoặc xử lý.

**Kiểm kê kho định kỳ:** Hỗ trợ tạo phiên kiểm kê, nhân viên đếm số lượng thực tế và nhập vào hệ thống. Khi chốt kiểm kê, hệ thống tự động tính toán chênh lệch thừa/thiếu và tự động tạo phiếu xuất/nhập bù trừ để cập nhật lại số tồn kho sổ sách bằng số đếm thực tế.

Ảnh 4: Sơ đồ use case của hệ thống.

- Xây dựng mô hình thử nghiệm,

Cài đặt cấu hình, dữ liệu thực nghiệm

Triển khai thử nghiệm và đánh giá

CHƯƠNG 5 KẾT QUẢ, KẾT LUẬN VÀ KIẾN NGHỊ

- KẾT QUẢ

Mô tả ngắn gọn công việc nghiên cứu khoa học đã tiến hành, các kết quả nghiên cứu khoa học hoặc kết quả thực nghiệm. Đối với các đề tài ứng dụng có kết quả là sản phẩm phần mềm phải chỉ rõ các chức năng mà chương trình đã dạt được, phạm vi ứng dụng, ưu nhựơc điểm của chương trình

- Đối với đề tài theo hướng nghiên cứu cơ bản: kết quả đạt được của tiểu luận được trình bày dưới dạng bài báo khoa học và chương trình phần mềm là giải thuật đã lựa chọn trong tiểu luận.

- Đối với đề tài theo hướng xây dựng ứng dụng phần mềm: kết quả đạt được là sản phẩm phần mềm hoàn chỉnh, kèm theo hướng dẫn sử dụng chương trình (phụ lục)

- Đối với đề tài theo hướng quản trị mạng: kết quả đạt được là triển khai giải pháp trong môi trường thực tế hoặc trên phần mềm giả lập.

KẾT LUẬN

- Phần này phải căn cứ vào các dẫn liệu khoa học thu được trong quá trình nghiên cứu của tiểu luận hoặc đối chiếu với kết quả nghiên cứu của các tác giả khác thông qua các tài liệu tham khảo.

- Trình bày những kết quả đạt được, những đóng góp mới và những đề xuất mới.

- Phần kết luận cần ngắn gọn, không có lời bàn và bình luận thêm.

  **KIẾN NGHỊ**

- Kiến nghị về sử dụng kết quả nghiên cứu và những hướng nghiên cứu tiếp theo

TÀI LIỆU THAM KHẢO

- [1]M. Koder, “Increasing Full Stack Development Productivity via Technology Selection”, Luận văn Thạc sĩ, 2021. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: Microsoft Word - Master's thesis 2021-11-20.docx

[2] K. Lei, Y. Ma, và Z. Tan, "Performance Comparison and Evaluation of Web Development Technologies in PHP, Python, and Node.js", trong 2014 IEEE 17th International Conference on Computational Science and Engineering (CSE), 2014, tr. 661–668, doi: 10.1109/CSE.2014.142. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: Performance Comparison and Evaluation of Web Development Technologies in PHP, Python, and Node.js

[3] A. Pophali, "Managing concurrent transactions in E-commerce", World Journal of Advanced Engineering Technology and Sciences, vol. 15, no. 2, tr. 1532–1540, 2025, doi: 10.30574/wjaets.2025.15.2.0689. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: https://wjaets.com/sites/default/files/fulltext_pdf/WJAETS-2025-0689.pdf

[4] J. Attala và C. Khemapatpapan, "Comparing the Performance of ORMs", Journal of Computer and Creative Technology, vol. 3, no. 2, tr. 201–213, 2025, doi: 10.14456/jcct.2025.16. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: https://so13.tci-thaijo.org/index.php/jcct/article/view/2330

[5] Nguyễn Thanh Minh, Nguyễn Công Dũng, và Lê Anh Huyền Trâm, "Thuộc tính bán lẻ của cửa hàng tiện lợi ở các thị trường có nền kinh tế chuyển đổi: Nghiên cứu ở Việt Nam", Tạp chí Khoa học Đại học Mở Thành phố Hồ Chí Minh – Kinh tế và Quản trị Kinh doanh, vol. 14, no. 3, tr. 160–175, 2019, doi: 10.46223/HCMCOUJS.econ.vi.14.3.484.2019. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: https://journalofscience.ou.edu.vn/index.php/econ-vi/article/view/484

[6] M. Lathkar, High-Performance Web Apps with FastAPI: The Asynchronous Web Framework Based on Modern Python. Apress, 2023, doi: 10.1007/978-1-4842-9178-8. Truy cập: 26 Tháng Bảy 2026. [Online]. Có tại: https://link.springer.com/book/10.1007/978-1-4842-9178-8

[7] Baeldung on Computer Science, “Layered Architecture.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/cs/layered-architecture

[8] Baeldung, “Intro to Inversion of Control and Dependency Injection with Spring.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/inversion-control-and-dependency-injection-in-spring

[9] Google Cloud, “REST API basics and implementation.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://cloud.google.com/discover/what-is-rest-api#what-is-rest-api

[10] Baeldung, “Pessimistic Locking in JPA.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/jpa-pessimistic-locking

[11] S. Roy, “Authentication vs Authorization”, Baeldung on Computer Science, 2023. Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/cs/authentication-vs-authorization

[12] Baeldung on Computer Science, “Cache Write Policy.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/cs/cache-write-policy

[13] Baeldung on Computer Science, “The Difference Between Asynchronous and Multi-Threading.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/cs/async-vs-multi-threading

[14] Wikipedia, “First Expired, First Out.” Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://en.wikipedia.org/wiki/First_Expired,_First_Out

[15] GeeksforGeeks, "Point of Sale (POS): Full Form, Features, Types and Example." Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.geeksforgeeks.org/finance/point-of-sale-pos-full-form-features-types-and-example/

[16] ASGI Documentation, "Introduction." Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://asgi.readthedocs.io/en/latest/introduction.html

[17] Baeldung on Computer Science, "What Is an ORM? How Does It Work? How Should We Use One?" Truy cập: 27 Tháng Bảy 2026. [Online]. Có tại: https://www.baeldung.com/cs/object-relational-mapping

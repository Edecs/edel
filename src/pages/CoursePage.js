/* Course and Sub-Course Buttons with Scrollable Container */
.course-page {
  margin: 100px;
}
.course-page .courses-container {
  width: 50%;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.course-page .course-buttons,
.course-page .sub-course-buttons {
  height: 642px;
  margin-top: 20px;
  margin-bottom: 20px;
  overflow-x: auto; /* إظهار شريط التمرير العمودي عند الحاجة */
  align-items: center; /* توسيط الأزرار عمودياً */
  gap: 10px; /* الفجوة بين الأزرار */
  border: 1px solid #ccc; /* حدود للحاوية */
  background-color: #f9f9f9; /* لون خلفية خفيف للحاوية */
  border-radius: 8px; /* زوايا مدورة للحاوية */
  transition: background-color 0.3s ease; /* إضافة تأثير انتقالي للخلفية */
  width: 100%; /* عرض أقصى للصندوق */
}

.course-page button {
  padding: 12px 18px; /* زيادة المساحة لجعل الزر أكثر راحة */
  background-color: #ffffff; /* لون الخلفية للأزرار */
  color: #094d50; /* لون النص */
  border: 1px solid #094d509a; /* تحديد لون الحدود وسماكتها */
  border-radius: 4px; /* زوايا مدورة */
  cursor: pointer; /* شكل المؤشر عند المرور على الزر */
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s; /* إضافة تأثيرات انتقالية */
  &:hover {
    background-color: #094d50; /* تغيير لون الخلفية عند التحويم */
    color: #ffffff; /* تغيير لون النص عند التحويم */
    transform: translateY(-2px); /* رفع خفيف عند التحويم */
  }

  /* تأثير عند الضغط على الزر */
  &:active {
    transform: translateY(1px); /* تأثير ضغط عند الضغط */
  }
}

/* Title Styles */
.course-page h1 {
  color: #000000;
  font-size: 30px;
  margin-top: 80px;
}

.course-page h2,
.course-page h3,
.course-page h4 {
  margin-bottom: 40px;
  color: #094d50; /* لون النص */
}

.course-page h2 {
  font-size: 24px; /* حجم النص */
  border-bottom: 2px solid #094d50; /* خط */
  padding-bottom: 8px; /* المسافة بين النص والخط */
  transition: color 0.3s ease, border-bottom 0.3s ease; /* تأثير انتقال سلس */
}

.course-page h3 {
  font-size: 20px;
  text-align: left;
  border-bottom: 2px solid #094d50;
}

.course-page h4 {
  font-size: 16px;
  margin-bottom: 5px;
}

/* Input Fields */
.course-page input[type="text"],
.course-page textarea {
  width: 90%;
  padding: 12px; /* زيادة المساحة داخل حقول الإدخال */
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s; /* Transition for focus effect */
}

.course-page textarea {
  height: 100px;
  resize: vertical;
}

/* Input Focus Effect */
.course-page input[type="text"]:focus,
.course-page textarea:focus {
  outline: none;
}

/* Course and Sub-Course Buttons Styling */
.course-page .course-buttons button.selected,
.course-page .sub-course-buttons button.selected {
  margin-top: 10px;
  width: 50%;
  background-color: #ffffff; /* لون الخلفية عند التحديد */
  color: #094d50;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* إضافة ظل خفيف */
}
.sub-course-buttons button {
  width: 50%;
}
.course-buttons button {
  width: 50%;
}
.course-page .course-buttons button.selected:hover,
.course-page .sub-course-buttons button.selected:hover {
  background-color: #d1d3cb; /* لون الخلفية عند التحويم مع التحديد */
  color: #2ba9af;
}

/* Button Focus Effect */
.course-page button:focus {
  background-color: #ffffff; /* Highlight selected buttons */
  color: #094d50;
}

/* Button Active Effect */
.course-page button:active {
  background-color: #ffffff; /* لون الزر عند الضغط */
  transform: translateY(1px); /* تأثير الضغط لأسفل */
}

/* Error Message Styles */
.course-page .error-message {
  color: red;
  font-size: 14px;
  margin-top: 10px;
}

/* Details and Summary Styles */
.course-page details {
  margin-bottom: 20px;
}
/* التنسيق العادي للـ summary */
.course-page summary {
  margin-top: 60px;
  border: 1px solid #094d50;
  background-color: #ffffff;
  color: #094d50;
  padding: 30px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s; /* انتقال للألوان */
}

/* عندما يكون الـ details مفتوحًا */
.course-page details[open] summary {
  background-color: #094d50;
  color: #ffffff;
}

/* عند التركيز أو الضغط */
.course-page summary:focus,
.course-page summary:active {
  outline: none; /* إزالة الإطار الأزرق الافتراضي */
}

/* Course and Sub-Course Selectors */
.course-page .course-selectors {
  justify-content: space-between; /* توزيع المساحة بين الأقسام */
  margin-top: 20px;
}
/* تنسيق زر للـ li */
.course-page .sub-course-buttons li {
  width: 50%;
  display: inline-block; /* ليبدو كزر */
  margin: 5px; /* مسافة خارجية بسيطة بين العناصر */
  cursor: default; /* شكل المؤشر */
  text-align: center; /* محاذاة النص داخل الزر */
  user-select: none; /* منع التحديد */
  padding: 12px 18px;
  background-color: #ffffff;
  color: #094d50;
  border: 1px solid #094d509a;
  border-radius: 4px;
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s;
}

/* تأثير عند التحويم */
.course-page .sub-course-buttons li:hover {
  background-color: rgb(255, 255, 255) (255, 255, 255);
  color: #094d50;
}

/* Media Section Styles */
.media-and-questions {
  margin-left: 11px;
}

.add-course,
.add-sub-course {
  flex: 1; /* كل قسم يأخذ نفس المساحة */
  margin: 0 10px; /* مساحة بين الأقسام */
  border: 1px solid #ccc; /* حدود للأقسام */
  border-radius: 8px; /* زوايا مدورة */
  background-color: #f9f9f9; /* خلفية خفيفة */
  transition: background-color 0.3s; /* تأثير انتقالي لخلفية الأقسام */
}

.add-course:hover,
.add-sub-course:hover {
  background-color: #eaeaea; /* تغيير لون الخلفية عند التحويم */
}

.course-selection-container {
  border: 1px solid #ccc; /* حدود الحاوية */
  border-radius: 8px; /* زوايا مدورة */
  padding: 15px; /* مسافة داخلية للحاوية */
  background-color: #f9f9f9; /* لون خلفية خفيف */
  margin-top: 32px;
}

.sub-course-item {
  width: 100%;
  border: 1px solid #ccc; /* حدود */
  border-radius: 4px; /* زوايا مدورة */
  margin-bottom: 5px; /* مسافة بين العناصر */
  background-color: #f9f9f9; /* خلفية خفيفة */
}

.course-selection {
  display: flex; /* استخدم flexbox لترتيب العناصر بجانب بعضها */
  justify-content: space-between; /* لضبط المساحة بين العناصر */
  align-items: center; /* لمركز العناصر عموديًا */
  margin-bottom: 20px; /* إضافة مسافة أسفل لتفادي تداخل العناصر */
}

.course-dropdown {
  flex: 1; /* كل مجموعة تأخذ نفس المساحة */
  margin: 0 10px; /* مساحة بين المجموعات */
}

.dropdown {
  width: 100%; /* تأكد من أن قائمة dropdown تأخذ العرض الكامل */
  padding: 12px; /* زيادة المساحة داخل قائمة الاختيار */
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
  transition: border-color 0.3s, box-shadow 0.3s; /* Transition for focus effect */
}

/* Dropdown Options Padding */
.dropdown option {
  padding: 10px;
}

/* Media Section Images and Links */
.course-page .media-section img {
  width: 100px;
  height: auto;
  margin-right: 10px;
}

.course-page .media-section video {
  display: block;
  margin-bottom: 10px;
}

.course-page .media-section a {
  color: #094d50;
  text-decoration: none;
  margin-bottom: 10px;
  display: inline-block;
  transition: color 0.3s; /* تأثير انتقالي على اللون */
}

.course-page .media-section a:hover {
  text-decoration: underline;
}

/* Questions Section Styles */
.course-page .question-section {
  margin-bottom: 20px;
}

.course-page .answers-section {
  margin-top: 10px;
}

.course-page .answers-section div {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.answers-container {
  margin-top: 16px; /* Space above the answers container */
  border: 1px solid #ccc; /* Light gray border */
  border-radius: 5px; /* Slightly rounded corners */
  padding: 16px; /* Padding inside the container */
  background-color: #f9f9f9; /* Light background color */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Subtle shadow */
}

.answers-section input[type="checkbox"] {
  margin-right: 10px;
}

/* Container for Sections */
.course-page .section-container {
  display: flex;
  flex-wrap: wrap; /* للتأكد من التداخل بشكل جيد في الشاشات الصغيرة */
  justify-content: space-between;
}

.course-media-container {
  justify-content: center; /* توسيط العناصر أفقياً */
  align-items: center; /* توسيط العناصر عمودياً */
  width: 90%; /* تحديد عرض الحاوية */
  gap: 20px; /* المسافة بين العناصر */
  margin: 0 auto; /* توسيط الحاوية نفسها أفقياً */
}

/* Delete Button */
.delete-button {
  background-color: #dc3545; /* لون الخلفية لزر الحذف */
  color: white; /* لون النص */
  border: none; /* إزالة الحدود */
  padding: 10px 15px; /* هوامش الزر */
  margin-top: 10px; /* مسافة أعلى زر الحذف */
  cursor: pointer; /* شكل المؤشر عند المرور على الزر */
  border-radius: 5px; /* زوايا دائرية */
  transition: background-color 0.3s, transform 0.2s; /* تأثير انتقال لون الخلفية */
}

.delete-button:hover {
  background-color: #c82333; /* لون الخلفية عند المرور */
  transform: translateY(-2px); /* تأثير الرفع عند التحويم */
}
.button-container {
  display: flex; /* استخدام flexbox لتوسيع العنصر */
  justify-content: center; /* محاذاة المحتوى إلى الوسط أفقيًا */
  align-items: center; /* محاذاة المحتوى إلى الوسط عموديًا */
}

.question-answers-container {
  background-color: #f9f9f9; /* لون خلفية فاتح للحاوية */
  padding: 20px; /* مساحة داخلية حول المحتوى */
  border: 1px solid #ddd; /* لون حدود خفيف */
  border-radius: 8px; /* زوايا مدورة */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* تأثير ظل لطيف */
  margin-bottom: 20px; /* مساحة سفلية بين الحاويات */
}

.question-section {
  margin-bottom: 15px; /* مساحة سفلية بين قسم الأسئلة وقسم الإجابات */
}
.question-button,
.answer-button {
  color: white; /* لون النص */
  border: none; /* إزالة الحدود الافتراضية */
  border-radius: 5px; /* زوايا مستديرة */
  padding: 10px 15px; /* حشوة داخلية */
  cursor: pointer; /* تغيير المؤشر عند التمرير فوق الزر */
  font-size: 16px; /* حجم الخط */
  transition: background-color 0.3s, transform 0.2s; /* تأثير التغيير */
}

.question-button:hover,
.answer-button:hover {
  transform: scale(1.05); /* تكبير الزر قليلاً عند التحويم */
}

.question-button:disabled,
.answer-button:disabled {
  background-color: #ccc; /* لون الخلفية عند التعطيل */
  cursor: not-allowed; /* تغيير المؤشر عند التعطيل */
}

.question-button:disabled:hover,
.answer-button:disabled:hover {
  background-color: #ccc; /* الحفاظ على اللون عند التحويم أثناء التعطيل */
}

.answers-section {
  margin-top: 15px; /* مساحة علوية بين عنوان الإجابات والمحتوى */
}

/* تنسيق الحاوية للأزرار */
.question-answers-container {
  .question-section,
  .answers-section {
    margin-bottom: 15px; /* مساحة سفلية بين الأقسام */
  }
  .button-container {
    display: flex; /* استخدام flexbox */
    justify-content: center; /* توسيط المحتوى أفقيًا */
    margin-top: 10px; /* إضافة هامش أعلى للحاوية */
  }

  .question-section button,
  .answers-section button {
    background-color: #f8ffff; /* لون خلفية الزر */
    color: #094d50; /* لون النص */
    border: none; /* إزالة الحدود الافتراضية */
    border-radius: 5px; /* زوايا مستديرة */
    padding: 10px 15px; /* حشوة داخلية */
    cursor: pointer; /* تغيير المؤشر عند التمرير فوق الزر */
    font-size: 16px; /* حجم الخط */
    transition: background-color 0.3s, transform 0.2s; /* تأثير التغيير */
  }

  /* التأثير عند التحويم */
  .question-section button:hover,
  .answers-section button:hover {
    background-color: #094d50; /* تغيير لون الخلفية عند التحويم */
    color: #ffffff;
    transform: scale(1.05); /* تكبير الزر قليلاً عند التحويم */
  }

  /* حالة الزر المعطلة */
  .question-section button:disabled,
  .answers-section button:disabled {
    background-color: #ccc; /* لون الخلفية عند التعطيل */
    cursor: not-allowed; /* تغيير المؤشر عند التعطيل */
  }

  .question-section button:disabled:hover,
  .answers-section button:disabled:hover {
    background-color: #ccc; /* الحفاظ على اللون عند التحويم أثناء التعطيل */
  }
}
.questions-list {
  padding: 10px;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.question-item {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #fff;
}

.question-item h4 {
  text-align: left;
}

.answer-item {
  margin: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-question,
.edit-answer {
  display: flex;
  align-items: center;
}

.edit-question input,
.edit-answer input {
  flex: 1;
  padding: 5px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.save-button,
.edit-button,
.delete-button {
  padding: 5px 10px;
  margin-left: 5px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  color: white;
}

.save-button:hover,
.edit-button:hover,
.delete-button:hover {
  background-color: #0056b3;
}

.question-input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
}

.question-submit-button {
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

.answer-item {
  display: flex;
  align-items: center;
}

.answer-checkbox {
  margin-right: 10px;
}

.answer-edit-button {
  padding: 5px 10px;
  border: none;
  cursor: pointer;
}

.new-answer-input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
}

.answer-submit-button {
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.05); /* خلفية داكنة */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* الـ popup يظهر فوق كل شيء */
}

.popup-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px px rgba(0, 0, 0, 0.05);
  width: 650px;
  max-width: 90%;
  text-align: center;
}

.popup-content h2 {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.popup-content h4 {
  display: flex;
  width: fit-content;
  text-align: left;
  margin-top: 15px;
  font-size: 18px;
  color: #333;
}

.popup-content input[type="text"] {
  width: calc(100% - 20px);
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.popup-content .error-message {
  margin-top: 10px;
  font-size: 14px;
}

/* أزرار مخصصة للـ popup */
.popup-content button {
  border: #094d50 3px;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  margin-top: 10px;
  margin-right: 5px;
  transition: background-color 0.3s, transform 0.2s;
}
.Add-answer {
  display: flex;
}
/* زر "Add Answer" */
.popup-content .add-answer-btn {
  width: fit-content;
  height: fit-content;
}
.align-left {
  margin-left: 14px;
  display: flex;
  justify-content: flex-start; /* توجيه المحتوى إلى أقصى اليسار */
  align-items: center; /* محاذاة العناصر بشكل عمودي إذا لزم الأمر */
  margin-top: 10px; /* مساحة صغيرة للفصل بين العناصر */
}

.popup-content .add-answer-btn:hover {
  transform: scale(1.05);
}

/* زر "Save" */
.popup-content .save-question-btn {
  color: #ffffff;
  background-color: #094d50;
}

.popup-content .save-question-btn:hover {
  transform: scale(1.05);
  color: #094d50;
  background-color: #ffffff;
}

.popup-content .close-popup-btn {
  margin-left: 561px;
  width: fit-content;
  color: rgb(0, 0, 0);
}

.popup-content .close-popup-btn:hover {
  transform: scale(1.05);
}
.question-item {
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 5px;
}

.question-item {
  display: flex;
  flex-direction: column; /* تغيير الاتجاه لعرض العناصر في عمود */
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 15px;
}

.answer-item {
  display: flex;
  justify-content: space-between; /* لمحاذاة الإجابات والأزرار */
  align-items: center; /* محاذاة العناصر عموديًا في الوسط */
  gap: 10px; /* إضافة مسافة بين العناصر */
  margin-bottom: 5px;
}

.edit-button,
.delete-button {
  padding: 5px 10px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.edit-button {
  background-color: #2196f3; /* لون الزر الأزرق */
  color: white;
}

.delete-button {
  background-color: #d9534f; /* لون الزر الأحمر */
  color: white;
}

.edit-button:hover,
.delete-button:hover {
  opacity: 0.8; /* تأثير عند المرور فوق الأزرار */
}
.media-display {
  display: flex;
  flex-wrap: wrap; /* Allows wrapping of items to new lines */
  gap: 20px; /* Space between media items */
  padding: 20px; /* Padding around the media display */
}

.media-item1 {
  background-color: #f8f8f8; /* Light gray background for media items */
  border: 1px solid #ccc; /* Light border */
  border-radius: 8px; /* Rounded corners */
  overflow: hidden; /* Hides overflow content */
  width: 300px; /* Fixed width for media items */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Slight shadow for depth */
  position: relative; /* For positioning the delete button */
}

.media-item1 img,
.media-item1 video {
  width: 100%; /* Full width */
  height: auto; /* Maintain aspect ratio */
  border-bottom: 1px solid #ccc; /* Divider between media and button */
}

.delete-button-container {
  display: flex; /* Center the button */
  justify-content: center; /* Center align the button */
  padding: 10px 0; /* Space above and below the button */
  margin-top: 10px; /* Space between media and button */
}

.vim {
  border: none; /* No border */
  border-radius: 4px; /* Rounded corners */
  padding: 10px 15px; /* Padding inside button */
  cursor: pointer; /* Pointer cursor on hover */
  transition: background-color 0.3s ease; /* Smooth transition */
}

.forms-container {
  gap: 20px; /* مسافة بين الجزأين */
  flex-wrap: wrap; /* يسمح بانتقال الجزأين للأسفل عند صغر الشاشة */
}

.course-form-box,
.sub-course-box {
  height: 500px;

  flex: 1; /* Allow each container to take up equal space */
  padding: 16px;
  background-color: #f9f9f9; /* خلفية لفصل العناصر بصريًا */
  border-radius: 8px; /* زوايا مدورة */
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.1); /* ظل خفيف */
}

.gg {
  display: flex; /* استخدم الفلكس لتوزيع العناصر أفقيًا */
  align-items: center; /* محاذاة العناصر في المنتصف عموديًا */
  gap: 10px; /* إضافة مسافة بين العنوان والزر */
}

.gg h2 {
  margin: 0; /* إزالة الهوامش الافتراضية */
  flex-grow: 1; /* جعل العنوان يأخذ المساحة المتاحة */
}

.gg1 {
  margin-bottom: 15px;
  display: flex; /* استخدم الفلكس لتوزيع العناصر أفقيًا */
  align-items: center; /* محاذاة العناصر في المنتصف عموديًا */
  gap: 10px; /* إضافة مسافة بين العنوان والزر */
}

.gg1 h2 {
  margin: 0; /* إزالة الهوامش الافتراضية */
  flex-grow: 1; /* جعل العنوان يأخذ المساحة المتاحة */
}
.right {
  margin-top: 20px;
  background-color: #094d50 !important;
  color: #ffffff !important;
  padding: 8px 12px; /* إضافة مساحة داخلية لجعل الزر أكبر قليلاً */
  width: 120px; /* جعل العرض يتناسب مع المحتوى */
  height: fit-content; /* جعل الارتفاع يتناسب مع المحتوى */
  border: none; /* بدون حدود */
  border-radius: 4px; /* زوايا مدورة */
  cursor: pointer; /* شكل المؤشر عند التحويم */
  transition: background-color 0.3s; /* تأثير عند تغيير اللون */
  display: flex; /* استخدم الفلكس لتوسيع الزر */
  align-items: center; /* محاذاة العناصر في المنتصف عموديًا */
  justify-content: center; /* توسيط المحتوى داخل الزر */
}
.right:hover {
  background-color: #ffffff !important;
  color: #094d50 !important;
}
.Add-answer {
  display: flex; /* استخدم الفلكس لتوزيع العناصر أفقيًا */
  justify-content: space-between; /* توزيع المساحة بين العناصر */
}

.popup-content.right2 {
  border: #094d50 !important;
  padding: 8px 12px; /* إضافة مساحة داخلية لجعل الزر أكبر قليلاً */
  width: fit-content; /* جعل العرض يتناسب مع المحتوى */
  height: fit-content; /* جعل الارتفاع يتناسب مع المحتوى */
  cursor: pointer; /* شكل المؤشر عند التحويم */
  transition: background-color 0.3s; /* تأثير عند تغيير اللون */
}

.add-course-form,
.add-sub-course-form {
  display: flex; /* عرض العناصر بجانب بعضها */
  gap: 10px; /* فجوة بين العناصر */
  align-items: center; /* توسيط العناصر عموديًا */
  margin-bottom: 10px; /* مسافة سفلية بين الحقول */
  width: 100%; /* جعل الحاويات تأخذ عرض الصفحة بالكامل */
}

.add-course-form input,
.add-sub-course-form input {
  flex-grow: 1; /* لجعل الحقل يتمدد ليشغل مساحة أكبر */
  padding: 5px; /* مسافة داخلية للحقل */
}

/* Change background color when open */

/* Style for input fields */
input[type="text"] {
  width: calc(100% - 20px); /* Full width minus padding */
  padding: 8px; /* Padding inside input */
  margin-bottom: 8px; /* Space below inputs */
  border-radius: 4px; /* Slightly rounded corners */
}

/* Media display styling */
.media-display {
  gap: 16px; /* Space between items */
}

.media-display img {
  max-width: 100%; /* Responsive image */
  height: auto; /* Maintain aspect ratio */
  border-radius: 4px; /* Rounded corners for images */
}

.media-display video {
  max-width: 100%; /* Responsive video */
  height: auto; /* Maintain aspect ratio */
  border-radius: 4px; /* Rounded corners for videos */
}

/* Section headers */
.course-page h2 {
  font-size: 20px; /* Size for section headers */
  margin-bottom: 8px; /* Margin below section headers */
}

/* Button styles */

/* Input fields */
input[type="text"] {
  width: calc(100% - 20px); /* Full width minus padding */
  padding: 8px; /* Padding inside input */
  margin-bottom: 16px; /* Space below inputs */
  border: 1px solid #007bff; /* Blue border */
  border-radius: 4px; /* Slightly rounded corners */
}

/* Button group styling */

.add-course-section {
  gap: 40px;
  display: flex; /* استخدام flexbox */
  flex-direction: row; /* الاتجاه الأفقي */
  width: 90%; /* عرض كامل */
  justify-content: center; /* محاذاة المحتوى في منتصف الصفحة أفقياً */
  margin: 0 auto; /* محاذاة الحاوية في المنتصف */
}

.course-buttons,
.sub-course-buttons {
  width: 50%;
  height: 569px;
  display: flex;
  flex-direction: column; /* Stack the course buttons vertically */
  gap: 16px; /* Space between each button */
}

.course-form-box,
.sub-course-box {
  gap: 5px;
  flex: 1; /* Allow the form boxes to take up available space */
  background-color: #f9f9f9; /* Light background for separation */
  padding: 16px; /* Add some padding inside the boxes */
  border-radius: 8px; /* Rounded corners for the boxes */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Slight shadow for depth */
}

.add-course-form {
  flex-direction: column; /* Stack inputs and buttons vertically */
  gap: 8px; /* Space between input fields and buttons */
}
/* Sub-course section */

.add-sub-course-form {
  gap: 8px; /* Space between input and button */
}
.answers-container {
  display: flex; /* Align items in a row */
  align-items: flex-start; /* Align items at the top */
  gap: 16px; /* Space between answers and buttons */
}
.answers-container {
  display: flex;
  justify-content: space-between; /* Space the answer section and buttons to left and right */
  align-items: flex-start; /* Align items at the top */
  gap: 16px; /* Space between answers and buttons */
}
.answers-container {
  display: flex;
  align-items: flex-start; /* Align items to the top */
  gap: 16px; /* Space between answers and buttons */
}

.answer-list {
  display: flex;
  flex-direction: column; /* Stack answers vertically */
  flex-grow: 1;
  gap: 8px; /* Space between answers */
}

.answer-content {
  margin-bottom: 5px;
  width: 100%; /* Full width for each answer */
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.1); /* Add shadow for depth */
}
.a1 {
  justify-content: center; /* توسيط المحتوى داخل الزر */
  align-items: center; /* محاذاة العناصر عموديًا */
  padding: 10px 20px; /* مساحة داخلية لجعل الزر أكبر */
  border: none; /* بدون حدود */
  border-radius: 4px; /* زوايا مدورة */
  cursor: pointer; /* شكل المؤشر عند التحويم */
  transition: background-color 0.3s; /* تأثير عند تغيير اللون */
}

.action-buttons button {
  border: 1px solid #094d509a;
  justify-content: center;
  text-align: center;
  width: 100%;
  display: flex;
  margin-bottom: 14px;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.action-buttons button:hover {
  background-color: #094d50;
}

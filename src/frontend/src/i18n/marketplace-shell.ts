import brand from "../../marketplace-brand.json";

export const marketplaceShell = {
  "{name} home": {
    ru: "{name}: главная",
    ka: "{name}: მთავარი გვერდი",
  },
  Theme: { ru: "Тема", ka: "თემა" },
  System: { ru: "Системная", ka: "სისტემური" },
  Light: { ru: "Светлая", ka: "ნათელი" },
  Dark: { ru: "Тёмная", ka: "მუქი" },
  "List a property": { ru: "Добавить объявление", ka: "განცხადების დამატება" },
  "Sign in with Internet Identity": {
    ru: "Войти через Internet Identity",
    ka: "შესვლა Internet Identity-ით",
  },
  "Property discovery in Tbilisi, Georgia.": {
    ru: "Поиск недвижимости в Тбилиси, Грузия.",
    ka: "უძრავი ქონების ძიება თბილისში, საქართველო.",
  },
  "Seller workspace": { ru: "Кабинет продавца", ka: "გამყიდველის კაბინეტი" },
  "Expand sidebar": { ru: "Развернуть меню", ka: "გვერდითი მენიუს გაშლა" },
  "Collapse sidebar": { ru: "Свернуть меню", ka: "გვერდითი მენიუს ჩაკეცვა" },
  Collapse: { ru: "Свернуть", ka: "ჩაკეცვა" },
  Sidebar: { ru: "Боковое меню", ka: "გვერდითი მენიუ" },
  "Sidebar navigation": { ru: "Боковая навигация", ka: "გვერდითი ნავიგაცია" },
  "Skip to content": { ru: "К содержимому", ka: "შინაარსზე გადასვლა" },
  Browse: { ru: "Обзор", ka: "დათვალიერება" },
  Explore: { ru: "Поиск", ka: "ძიება" },
  Saved: { ru: "Избранное", ka: "შენახული" },
  Workspace: { ru: "Управление", ka: "მართვა" },
  Listings: { ru: "Объявления", ka: "განცხადებები" },
  Account: { ru: "Аккаунт", ka: "ანგარიში" },
  "Your changes could not be saved in this browser.": {
    ru: "Не удалось сохранить изменения в этом браузере.",
    ka: "ამ ბრაუზერში ცვლილებების შენახვა ვერ მოხერხდა.",
  },
  "404 / PAGE NOT FOUND": {
    ru: "404 / СТРАНИЦА НЕ НАЙДЕНА",
    ka: "404 / გვერდი ვერ მოიძებნა",
  },
  "This page couldn’t be found.": {
    ru: "Эта страница не найдена.",
    ka: "ეს გვერდი ვერ მოიძებნა.",
  },
  "Admin sign-in": {
    ru: "Вход для администратора",
    ka: "ადმინისტრატორის შესვლა",
  },
  "Sign in with an administrator account to continue.": {
    ru: "Чтобы продолжить, войдите в аккаунт администратора.",
    ka: "გასაგრძელებლად შედით ადმინისტრატორის ანგარიშით.",
  },
  "Marketplace administration": {
    ru: "Управление площадкой",
    ka: "პლატფორმის მართვა",
  },
  "Manage listings": {
    ru: "Управление объявлениями",
    ka: "განცხადებების მართვა",
  },
  "Marketplace account": {
    ru: "Аккаунт на площадке",
    ka: "პლატფორმის ანგარიში",
  },
  "Your profile": { ru: "Ваш профиль", ka: "თქვენი პროფილი" },
  "Profile details": { ru: "Данные профиля", ka: "პროფილის მონაცემები" },
  "In BotFather, open {bot} → Login Widget → Allowed URLs and add {origin} and {profileUrl}.":
    {
      ru: "В BotFather откройте {bot} → Login Widget → Allowed URLs и добавьте {origin} и {profileUrl}.",
      ka: "BotFather-ში გახსენით {bot} → Login Widget → Allowed URLs და დაამატეთ {origin} და {profileUrl}.",
    },
  "Open BotFather": { ru: "Открыть BotFather", ka: "BotFather-ის გახსნა" },
  "Choose the display name and username for your account.": {
    ru: "Выберите имя для отображения и имя пользователя.",
    ka: "აირჩიეთ საჩვენებელი სახელი და მომხმარებლის სახელი.",
  },
  "Manage account names, usernames, and profile details.": {
    ru: "Управляйте именами, логинами и данными профилей.",
    ka: "მართეთ ანგარიშების სახელები, მომხმარებლის სახელები და პროფილის მონაცემები.",
  },
  "Add account": { ru: "Добавить аккаунт", ka: "ანგარიშის დამატება" },
  "Only admins can save listings.": {
    ru: "Сохранять объявления могут только администраторы.",
    ka: "განცხადებების შენახვა მხოლოდ ადმინისტრატორებს შეუძლიათ.",
  },
  "{area} m²": { ru: "{area} м²", ka: "{area} მ²" },
  [brand.description]: {
    ru: brand.descriptionRu,
    ka: "დაათვალიერეთ შერჩეული საცხოვრებელი, კომერციული ფართები და მიწის ნაკვეთები თბილისში, საქართველო.",
  },
  [brand.socialImageAlt]: {
    ru: brand.socialImageAltRu,
    ka: "თანამედროვე სახლი ფერდობზე შებინდებისას",
  },
} satisfies Record<string, { ru: string; ka: string }>;

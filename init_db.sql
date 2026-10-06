-- Создание БД
-- CREATE DATABASE exam;  -- выполнить отдельно от имени postgres
-- \c exam

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS order_statuses CASCADE;
DROP TABLE IF EXISTS pickup_points CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(role_id),
    full_name VARCHAR(150) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE units (
    unit_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE manufacturers (
    manufacturer_id SERIAL PRIMARY KEY,
    manufacturer_name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    article VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    unit_id INT NOT NULL REFERENCES units(unit_id),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    manufacturer_id INT NOT NULL REFERENCES manufacturers(manufacturer_id),
    category_id INT NOT NULL REFERENCES categories(category_id),
    discount INT NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    description TEXT,
    photo VARCHAR(255)
);

CREATE TABLE order_statuses (
    status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE pickup_points (
    point_id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    point_id INT NOT NULL REFERENCES pickup_points(point_id),
    user_id INT NOT NULL REFERENCES users(user_id),
    receive_code VARCHAR(10) NOT NULL,
    status_id INT NOT NULL REFERENCES order_statuses(status_id)
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- Роли
INSERT INTO roles(role_name) VALUES
('Администратор'), ('Менеджер'), ('Авторизированный клиент');

-- Статусы
INSERT INTO order_statuses(status_name) VALUES ('Новый'), ('Завершен');

-- Единицы измерения
INSERT INTO units(unit_name) VALUES ('шт.');

-- Категории
INSERT INTO categories(category_name) VALUES
('Художественная литература'),
('Учебник для вузов'),
('Хрестоматия'),
('Учебное пособие');

-- Поставщики (из Товар.xlsx)
INSERT INTO suppliers(supplier_name) VALUES
('Виктор Астафьев'),
('Гилберт Кит Честертон'),
('Кирилл Каланджи'),
('Людмила Улицкая'),
('Аркадий Гайдар'),
('Юрий Родичев'),
('Дэниел Джей Барретт'),
('Шон Кэрролл'),
('Яков Гордин'),
('Иосиф Бродский'),
('Янь Чуннянь Янь Чуннянь'),
('Дмитрий Мережковский'),
('Дмитрий Щербаков'),
('Роджер Осборн, Дэн Стерджис'),
('Любовь Беликова, Инна Ерофеева, Татьяна Шутова'),
('Сергей Моргачев'),
('Екатерина Габарта, Ирина Игнатьева'),
('Татьяна Лопаткина, Софья Маннапова');

-- Производители
INSERT INTO manufacturers(manufacturer_name) VALUES
('Яуза'),
('Т8 Издательские технологии'),
('Прогресс книга'),
('Время'),
('Лениздат'),
('Неолит'),
('Амрита-Русь'),
('Златоуст'),
('Аспект Пресс'),
('ВКН');

-- Пользователи (из user_import.xlsx)
INSERT INTO users(role_id, full_name, login, password) VALUES
(1, 'Никифорова Анна Семеновна', '94d5ous@gmail.com', 'uzWC67'),
(1, 'Стелина Евгения Петровна', 'uth4iz@mail.com', '2L6KZG'),
(1, 'Михайлюк Анна Вячеславовна', '5d4zbu@tutanota.com', 'rwVDh9'),
(2, 'Ситдикова Елена Анатольевна', 'ptec8ym@yahoo.com', 'LdNyos'),
(2, 'Ворсин Петр Евгеньевич', '1qz4kw@mail.com', 'gynQMT'),
(2, 'Старикова Елена Павловна', '4np6se@mail.com', 'AtnDjr'),
(3, 'Никифорова Весения Николаевна', 'yzls62@outlook.com', 'JlFRCZ'),
(3, 'Сазонов Руслан Германович', '1diph5e@tutanota.com', '8ntwUp'),
(3, 'Одинцов Серафим Артёмович', 'tjde7c@yahoo.com', 'YOyhfR'),
(3, 'Степанов Михаил Артёмович', 'wpmrc3do@tutanota.com', 'RSbvHv');

-- Товары (из Tovar.xlsx)
INSERT INTO products(article, name, unit_id, price, supplier_id, manufacturer_id, category_id, discount, stock, description, photo) VALUES
('А112Т4','Прокляты и убиты',1,585,1,1,1,25,6,'Роман-эпопею "Прокляты и убиты" Виктора Астафьева по праву считают одним из самых сильных и пронзительных произведений отечественной военной прозы.','1.jpg'),
('G843H5','Тайны и загадки отца Брауна',1,193,2,1,1,30,9,'Гилберт Кит Честертон — признанный классик английской литературы.','2.jpg'),
('D325D4','Девайс',1,1599,3,2,1,5,12,'Молодой фрилансер Захар Скаро устраивается на очередную подработку.','3.jpg'),
('S432T5','Необыкновенное обыкновенное чудо. Школьные истории',1,549,4,2,1,15,15,'','4.jpg'),
('F325D4','Чук и Гек',1,209,5,2,1,18,3,'В книгу вошли повести и рассказы Аркадия Петровича Гайдара.','5.jpg'),
('G432G6','Информационная безопасность. Национальные стандарты РФ',1,3899,6,3,2,22,3,'В учебном пособии рассмотрено более 300 документов.','6.jpg'),
('H542F5','Linux. Командная строка. Лучшие практики',1,1799,7,3,2,4,5,'Перейдите на новый уровень работы в Linux!','7.jpg'),
('C346F5','Квантовые миры и возникновение пространства-времени',1,1349,8,3,2,5,4,'Шон Кэрролл — физик-теоретик.','8.jpg'),
('F256G6','Вселенная. Происхождение жизни, смысл нашего существования',1,1799,8,3,2,6,2,'Знаменитый физик Шон Кэрролл объясняет принципы.',''),
('J532V5','Пушкин. Бродский. Империя и судьба. В 2-х томах',1,529,9,4,3,8,6,'Первая книга двухтомника.','10.jpg'),
('G643F4','Иосиф Бродский. Избранные эссе (комплект из 6-ти книг)',1,4925,10,5,3,2,24,'Шесть сборников избранных эссе Иосифа Бродского.','11.jpg'),
('J326V5','Тысячелетие императорской керамики',1,2599,11,5,3,5,4,'Фарфор стал величайшим символом китайской культуры.','12.jpg'),
('J632F6','Вечные спутники: Портреты из всемирной литературы',1,1599,12,5,3,0,6,'Книга "Вечные спутники" - это цикл критических очерков.','13.jpg'),
('G632H6','Формирование литературной репутации Н.Г.Чернышевского',1,1349,13,6,3,2,8,'Монография Д. А. Щербакова - новаторская.','14.jpg'),
('M642E5','Теория искусства. Краткий путеводитель',1,879,14,6,3,3,2,'','15.jpg'),
('G543F5','Религиозные верования с древнейших времен до наших дней',1,879,13,7,3,4,6,'Настоящее издание представляет собой сборник переводов.','16.jpg'),
('B653G6','Русский язык: Первые шаги. Часть 3',1,2699,15,8,4,8,9,'Пособие является завершающей частью учебного комплекса.','17.jpg'),
('J735J7','Синтетический образ индивидуального психического мира',1,1099,16,8,3,9,4,'Психика подобна определенным объектам.','18.jpg'),
('H436H7','Английский язык в спорте: Учебное пособие',1,1999,17,9,4,2,0,'Учебное пособие подготовлено для слушателей.','19.jpg'),
('H475R5','Лексика и грамматика современного китайского языка',1,608,18,10,4,25,12,'Пособие выступает дополнением ко второму тому.','20.jpg');

-- Пункты выдачи (из Пункты выдачи_import.xlsx)
INSERT INTO pickup_points(address) VALUES
('420151, г. Лесной, ул. Вишневая, 32'),
('125061, г. Лесной, ул. Подгорная, 8'),
('630370, г. Лесной, ул. Шоссейная, 24'),
('400562, г. Лесной, ул. Зеленая, 32'),
('614510, г. Лесной, ул. Маяковского, 47'),
('410542, г. Лесной, ул. Светлая, 46'),
('620839, г. Лесной, ул. Цветочная, 8'),
('443890, г. Лесной, ул. Коммунистическая, 1'),
('603379, г. Лесной, ул. Спортивная, 46'),
('603721, г. Лесной, ул. Гоголя, 41'),
('410172, г. Лесной, ул. Северная, 13'),
('614611, г. Лесной, ул. Молодежная, 50'),
('454311, г.Лесной, ул. Новая, 19'),
('660007, г.Лесной, ул. Октябрьская, 19'),
('603036, г. Лесной, ул. Садовая, 4'),
('394060, г.Лесной, ул. Фрунзе, 43'),
('410661, г. Лесной, ул. Школьная, 50'),
('625590, г. Лесной, ул. Коммунистическая, 20'),
('625683, г. Лесной, ул. 8 Марта, 1'),
('450983, г.Лесной, ул. Комсомольская, 26'),
('394782, г. Лесной, ул. Чехова, 3'),
('603002, г. Лесной, ул. Дзержинского, 28'),
('450558, г. Лесной, ул. Набережная, 30'),
('344288, г. Лесной, ул. Чехова, 1'),
('614164, г.Лесной, ул. Степная, 30'),
('394242, г. Лесной, ул. Коммунистическая, 43'),
('660540, г. Лесной, ул. Солнечная, 25'),
('125837, г. Лесной, ул. Шоссейная, 40'),
('125703, г. Лесной, ул. Партизанская, 49'),
('625283, г. Лесной, ул. Победы, 46'),
('614753, г. Лесной, ул. Полевая, 35'),
('426030, г. Лесной, ул. Маяковского, 44'),
('450375, г. Лесной ул. Клубная, 44'),
('625560, г. Лесной, ул. Некрасова, 12'),
('630201, г. Лесной, ул. Комсомольская, 17'),
('190949, г. Лесной, ул. Мичурина, 26');
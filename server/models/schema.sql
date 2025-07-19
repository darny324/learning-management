CREATE TYPE category_type AS ENUM('technology', 'science', 'language');
CREATE TYPE interest_type AS ENUM('computer', 'networking', 'cyber security', 'physics', 'chemistry',
'biology', 'mathematics', 'english', 'spanish', 'japanese'
);
CREATE TYPE user_type AS ENUM('teacher', 'student');
CREATE TYPE level_type AS ENUM('beginner', 'intermediate', 'advanced');



CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    category category_type NOT NULL, 
    title VARCHAR(100) NOT NULL, 
    description TEXT, 
    price NUMERIC(10, 2) NOT NULL, 
    discount NUMERIC(3, 2) DEFAULT 0.0 CHECK (discount >= 0.0 AND discount <= 1.00), 
    teacher_id UUID REFERENCES users(user_id), 
    level level_type DEFAULT 'beginner', 
    duration INTEGER, 
    language VARCHAR(30) DEFAULT 'english', 
    thumbnail_url TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);


CREATE TABLE modules (
    module_id SERIAL PRIMARY KEY, 
    course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE, 
    module_title VARCHAR(100) NOT NULL, 
    description TEXT, 
    order_num INTEGER, 
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE tests (
    test_id SERIAL PRIMARY KEY, 
    module_id INTEGER REFERENCES modules (module_id) ON DELETE CASCADE,
    order_num INTEGER,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    question_id SERIAL PRIMARY KEY, 
    test_id INTEGER REFERENCES tests (test_id) ON DELETE CASCADE,
    question TEXT NOT NULL, 
    answers TEXT[] NOT NULL, 
    correct_answer INTEGER NOT NULL CHECK (correct_answer >= 1), 
    explanation TEXT,
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_of_user user_type DEFAULT 'student', 
    first_name VARCHAR(25) NOT NULL CONSTRAINT name_check CHECK(LENGTH(first_name) > 2),
    last_name VARCHAR(25) NOT NULL CONSTRAINT last_name_check CHECK(LENGTH(last_name) > 2),  
    email VARCHAR(75) UNIQUE NOT NULL, 
    phone_num VARCHAR(30) UNIQUE, 
    password TEXT NOT NULL, 
    profile_image TEXT NOT NULL, 
    bios TEXT NOT NULL, 
    interests interest_type NOT NULL,
    address POINT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finished_courses (
    user_id UUID REFERENCES users(user_id),
    course_id UUID REFERENCES courses(course_id), 
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (user_id, course_id)
);

CREATE TABLE finished_modules (
    user_id UUID REFERENCES users(user_id), 
    module_id INTEGER REFERENCES(module_id), 
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (user_id, module_id)
);

CREATE TABLE finished_tests (
    user_id UUID REFERENCES users (user_id), 
    test_id INTEGER REFERENCES tests(test_id), 
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (user_id, test_id)
);

CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY, 
    course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE, 
    module_id INTEGER REFERENCES modules(module_id) ON DELETE CASCADE, 
    order_num INTEGER, 
    title TEXT, 
    video_url TEXT, 
    text_url TEXT
);

CREATE TABLE enrollment (
    enrollment_id SERIAL PRIMARY KEY, 
    student_id UUID REFERENCES users(user_id), 
    course_id UUID REFERENCES courses(course_id), 
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    UNIQUE (student_id, course_id)
);





/*
student_id 
first_name
last_name
email 
password
profile_image
bios
interests
address
phone_num
created_at
updated_at
date_of_birth

*/
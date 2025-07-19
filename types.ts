type Student = {
    student_id: string, 
    name: string, 
    email: string, 
    bio: string, 
    profile_image: string, 
    interests: string[], 
    password: string, 
}

type Teacher = {
    teacher_id: string, 
    name: string, 
    email: string, 
    bio: string, 
    profile_image: string, 
    speciality: string[], 
    password: string, 
}

type User = Student | Teacher;

type Enrollment = {
    course_id: string,  
    enrollment_id: string,
    student_id: string, 
    enrollment_date: string, 
    price: Number,  
}

type Course = {
    course_id: string, 
    category_id: string, 
    price: Number,
    description: string,  
    title: string, 
    added_date: string, 
    last_update: string, 
}

type Category = {
    type: string, 
    category_id: string, 
    description: string, 
}

type Module = {
    module_id: string, 
    course_id: string, 
    module_title: string, 
}

type Resource = {
    resrouce_id: string, 
    module_id: string, 
    video_path?: string, 
    text_path?:string, 
}

type ModuleTest = {
    test_id: string, 
    module_id: string, 
    question: string, 
    choices: string [], 
    answer: number, 
}

type CourseTest = {
    test_id: string, 
    course_id: string,  
    question: string, 
    choices: string [], 
    answer: number, 
}

type NormalTestType = {
    normal_test_id: String, 
    test_title: string, 
    description: string, 
}

type Test = {
    normal_test_id: string, 
    test_id: string,  
    question: string,
    choices: string [], 
    answer: number,  
}



export {
    Student, 
    Teacher, 
    Enrollment, 
    Course, 
    CourseTest, 
    Module, 
    NormalTestType, 
    Test, 
    ModuleTest, 
    Category, 
    User, 
};
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const DATA_FILE = path.join(__dirname, 'data.json');

function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
            courses: [
                { id: 1, name: "Cấu trúc dữ liệu và giải thuật", code: "IT101" },
                { id: 2, name: "Cơ sở dữ liệu", code: "IT102" },
                { id: 3, name: "Mạng máy tính", code: "IT103" },
                { id: 4, name: "Trí tuệ nhân tạo", code: "IT104" },
                { id: 5, name: "Phát triển web", code: "IT105" }
            ],
            lecturers: [
                { id: 1, name: "Nguyễn Văn An", department: "Khoa CNTT" },
                { id: 2, name: "Trần Thị Bình", department: "Khoa CNTT" },
                { id: 3, name: "Lê Văn Cường", department: "Khoa ATTT" },
                { id: 4, name: "Hoàng Văn Em", department: "Khoa KHMT" }
            ],
            ratings: [],
            nextCourseId: 6,
            nextLecturerId: 5
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
}

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
}

// ==================== THUẬT TOÁN MERGE SORT ====================
function mergeSort(arr, key, reverse = false) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid), key, reverse);
    const right = mergeSort(arr.slice(mid), key, reverse);
    return merge(left, right, key, reverse);
}

function merge(left, right, key, reverse) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        const leftVal = key(left[i]);
        const rightVal = key(right[j]);
        if (reverse ? leftVal >= rightVal : leftVal <= rightVal) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
}

// ==================== API ====================
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json({ success: true, data: data });
});

app.post('/api/data', (req, res) => {
    writeData(req.body);
    res.json({ success: true });
});

// Học phần
app.get('/api/courses', (req, res) => {
    const data = readData();
    res.json({ success: true, courses: data.courses });
});

app.post('/api/courses', (req, res) => {
    const { name, code } = req.body;
    const data = readData();
    if (data.courses.some(c => c.name === name)) {
        return res.status(400).json({ success: false, message: 'Học phần đã tồn tại' });
    }
    const newCourse = { id: data.nextCourseId++, name, code };
    data.courses.push(newCourse);
    writeData(data);
    res.json(newCourse);
});

app.delete('/api/courses/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = readData();
    data.courses = data.courses.filter(c => c.id !== id);
    writeData(data);
    res.json({ success: true });
});

// Giảng viên
app.get('/api/lecturers', (req, res) => {
    const data = readData();
    res.json({ success: true, lecturers: data.lecturers });
});

app.post('/api/lecturers', (req, res) => {
    const { name, department } = req.body;
    const data = readData();
    if (data.lecturers.some(l => l.name === name)) {
        return res.status(400).json({ success: false, message: 'Giảng viên đã tồn tại' });
    }
    const newLecturer = { id: data.nextLecturerId++, name, department };
    data.lecturers.push(newLecturer);
    writeData(data);
    res.json(newLecturer);
});

app.delete('/api/lecturers/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = readData();
    data.lecturers = data.lecturers.filter(l => l.id !== id);
    writeData(data);
    res.json({ success: true });
});

// Đánh giá
app.get('/api/ratings', (req, res) => {
    const data = readData();
    res.json({ success: true, ratings: data.ratings });
});

app.post('/api/ratings', (req, res) => {
    const { type, targetId, targetName, score, comment, student } = req.body;
    const data = readData();
    const newRating = {
        id: data.ratings.length + 1,
        type, targetId, targetName, score, comment,
        student: student || 'Khách',
        date: new Date().toISOString().split('T')[0]
    };
    data.ratings.push(newRating);
    writeData(data);
    res.json(newRating);
});

// Import file
app.post('/api/import-courses', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không có file' });
    }
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const data = readData();
    let importedCount = 0;
    
    try {
        let importedCourses = [];
        if (ext === '.json') {
            const jsonData = JSON.parse(fileContent);
            if (Array.isArray(jsonData)) importedCourses = jsonData;
        } else if (ext === '.csv') {
            const lines = fileContent.split('\n');
            for (let line of lines) {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    importedCourses.push({ name: parts[0].trim(), code: parts[1].trim() });
                }
            }
        }
        for (let c of importedCourses) {
            if (c.name && c.code && !data.courses.some(ex => ex.name === c.name)) {
                data.courses.push({ id: data.nextCourseId++, name: c.name, code: c.code });
                importedCount++;
            }
        }
        writeData(data);
        res.json({ success: true, count: importedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// ==================== API SỬ DỤNG MERGE SORT ====================
// API 1: Lấy danh sách học phần đã xếp hạng theo rating (Merge Sort)
app.get('/api/ranking/courses', (req, res) => {
    const data = readData();
    
    // Tính rating trung bình cho từng học phần
    const courseRatings = data.courses.map(course => {
        const courseRatingsList = data.ratings.filter(r => r.type === 'course' && r.targetId === course.id);
        let avgRating = 0;
        if (courseRatingsList.length > 0) {
            const sum = courseRatingsList.reduce((a, b) => a + b.score, 0);
            avgRating = sum / courseRatingsList.length;
        }
        return {
            id: course.id,
            name: course.name,
            code: course.code,
            avgRating: parseFloat(avgRating.toFixed(2))
        };
    });
    
    // Lọc bỏ học phần chưa có đánh giá
    const validCourses = courseRatings.filter(c => c.avgRating > 0);
    
    if (validCourses.length === 0) {
        return res.json({ success: true, ranked: [], message: 'Chưa có đánh giá nào' });
    }
    
    // Áp dụng Merge Sort để sắp xếp theo avgRating (tăng dần)
    const sortedAsc = mergeSort(validCourses, item => item.avgRating, false);
    // Đảo ngược để lấy thứ tự giảm dần (cao nhất lên đầu)
    const ranked = sortedAsc.reverse();
    
    console.log('🏆 Xếp hạng học phần (Merge Sort - O(n log n)):');
    ranked.slice(0, 5).forEach((c, i) => console.log(`  ${i+1}. ${c.name} - ${c.avgRating} ⭐`));
    
    res.json({ success: true, ranked: ranked, algorithm: 'Merge Sort', complexity: 'O(n log n)' });
});

// API 2: Lấy danh sách giảng viên đã xếp hạng theo rating (Merge Sort)
app.get('/api/ranking/lecturers', (req, res) => {
    const data = readData();
    
    // Tính rating trung bình cho từng giảng viên
    const lecturerRatings = data.lecturers.map(lecturer => {
        const lecturerRatingsList = data.ratings.filter(r => r.type === 'lecturer' && r.targetId === lecturer.id);
        let avgRating = 0;
        if (lecturerRatingsList.length > 0) {
            const sum = lecturerRatingsList.reduce((a, b) => a + b.score, 0);
            avgRating = sum / lecturerRatingsList.length;
        }
        return {
            id: lecturer.id,
            name: lecturer.name,
            department: lecturer.department,
            avgRating: parseFloat(avgRating.toFixed(2))
        };
    });
    
    const validLecturers = lecturerRatings.filter(l => l.avgRating > 0);
    
    if (validLecturers.length === 0) {
        return res.json({ success: true, ranked: [], message: 'Chưa có đánh giá nào' });
    }
    
    const sortedAsc = mergeSort(validLecturers, item => item.avgRating, false);
    const ranked = sortedAsc.reverse();
    
    console.log('🏆 Xếp hạng giảng viên (Merge Sort):');
    ranked.slice(0, 5).forEach((l, i) => console.log(`  ${i+1}. ${l.name} - ${l.avgRating} ⭐`));
    
    res.json({ success: true, ranked: ranked, algorithm: 'Merge Sort', complexity: 'O(n log n)' });
});

// API 3: Tìm cặp học phần có rating gần nhau nhất (Chia để trị)
app.get('/api/ranking/closest-courses', (req, res) => {
    const data = readData();
    
    // Tính rating trung bình cho từng học phần
    const courseRatings = data.courses.map(course => {
        const courseRatingsList = data.ratings.filter(r => r.type === 'course' && r.targetId === course.id);
        let avgRating = 0;
        if (courseRatingsList.length > 0) {
            const sum = courseRatingsList.reduce((a, b) => a + b.score, 0);
            avgRating = sum / courseRatingsList.length;
        }
        return {
            id: course.id,
            name: course.name,
            code: course.code,
            avgRating: parseFloat(avgRating.toFixed(2))
        };
    });
    
    const validCourses = courseRatings.filter(c => c.avgRating > 0);
    
    if (validCourses.length < 2) {
        return res.json({ success: false, message: 'Cần ít nhất 2 học phần có đánh giá để so sánh' });
    }
    
    // Bước 1: Sắp xếp theo rating (Chia để trị)
    const sorted = mergeSort(validCourses, item => item.avgRating, false);
    
    // Bước 2: Duyệt tìm khoảng cách nhỏ nhất (O(n))
    let minDiff = Infinity;
    let closestPair = null;
    
    for (let i = 0; i < sorted.length - 1; i++) {
        const diff = Math.abs(sorted[i+1].avgRating - sorted[i].avgRating);
        if (diff < minDiff) {
            minDiff = diff;
            closestPair = [sorted[i], sorted[i+1]];
        }
    }
    
    console.log(`🔍 Cặp học phần gần nhau nhất (Chia để trị): ${closestPair[0].name} (${closestPair[0].avgRating}) ↔ ${closestPair[1].name} (${closestPair[1].avgRating}) | Chênh lệch: ${minDiff.toFixed(3)}`);
    
    res.json({
        success: true,
        course1: closestPair[0],
        course2: closestPair[1],
        difference: parseFloat(minDiff.toFixed(3)),
        algorithm: 'Divide and Conquer (Closest Pair)',
        complexity: 'O(n log n)'
    });
});

// API 4: Thống kê tổng hợp
app.get('/api/statistics', (req, res) => {
    const data = readData();
    
    // Tính rating trung bình tổng thể
    const allRatings = data.ratings.map(r => r.score);
    const overallAvg = allRatings.length > 0 
        ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2)
        : 0;
    
    // Đếm số lượng theo từng loại
    const courseRatingsCount = data.ratings.filter(r => r.type === 'course').length;
    const lecturerRatingsCount = data.ratings.filter(r => r.type === 'lecturer').length;
    
    // Phân bố điểm (1-5)
    const distribution = [0, 0, 0, 0, 0];
    data.ratings.forEach(r => {
        const idx = Math.floor(r.score) - 1;
        if (idx >= 0 && idx < 5) distribution[idx]++;
    });
    
    res.json({
        success: true,
        totalCourses: data.courses.length,
        totalLecturers: data.lecturers.length,
        totalRatings: data.ratings.length,
        courseRatingsCount: courseRatingsCount,
        lecturerRatingsCount: lecturerRatingsCount,
        overallAverageRating: parseFloat(overallAvg),
        ratingDistribution: distribution
    });
});

initDataFile();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📁 Dữ liệu lưu tại: ${DATA_FILE}`);
    console.log(`👨‍💼 Tài khoản Admin: admin / 123456`);
    console.log(`\n📊 Các API đã sẵn sàng:`);
    console.log(`   GET  /api/ranking/courses     - Xếp hạng học phần (Merge Sort)`);
    console.log(`   GET  /api/ranking/lecturers  - Xếp hạng giảng viên (Merge Sort)`);
    console.log(`   GET  /api/ranking/closest-courses - Cặp học phần gần nhất (Chia để trị)`);
    console.log(`   GET  /api/statistics         - Thống kê tổng hợp\n`);
});
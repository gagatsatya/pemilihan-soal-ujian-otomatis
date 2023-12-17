// from browser type :    http://localhost:3000/

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const koneksi = require('./config/database.js');

const app = express()
const port = 3000

// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

const opsi = "a. Opsi A \n b. Opsi B \n c. Opsi C \n d. Opsi D"

// Menangani rute untuk halaman utama
app.get('/', (req, res) => {
    const querySql = 'SELECT * FROM ujian';

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        // const dataFromDatabase = [
        //     { id: 1, name: 'Item 1', price: 10 },
        //     { id: 2, name: 'Item 2', price: 20 },
        //     // ...
        // ];
        rows.forEach(row=>{
            dataFromDatabase.push(row)
        })
        res.render('index', { title: 'Node.js EJS Tutorial',data: dataFromDatabase });
    });
  });

app.get('/lihatUjian/:id', (req, res) => {
    const querySql = `SELECT * FROM ujian WHERE id = ${req.params.id}`;

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        let soal = JSON.parse(rows[0].soal);
        // rows.forEach(row=>{
        //     row.soal = JSON.parse(row.soal)
        //     dataFromDatabase.push(row)
        //     soal.push(row.soal)
        // })
        // console.log(soal.length)
        
        res.render('lihatUjian', { title: 'Node.js EJS Tutorial',data: rows[0], soal, opsi });
    });
  });

app.get('/buatUjian', (req, res) => {
    res.render('buatUjian');
  });
app.post('/buatUjian', (req, res) => {
    const data = { ...req.body };
    const jumlahSoal = parseInt(data.jumlah_soal);

    const soalPerBab = {
        bab1: (parseInt(data.bab1) / 100) * jumlahSoal,
        bab2: (parseInt(data.bab2) / 100) * jumlahSoal,
        bab3: (parseInt(data.bab3) / 100) * jumlahSoal,
    };
    const tingkatKesulitan1 = {
        mudah: (parseInt(data.mudah1) / 100) * soalPerBab.bab1,
        sedang: (parseInt(data.sedang1) / 100) * soalPerBab.bab1,
        sulit: (parseInt(data.sulit1) / 100) * soalPerBab.bab1,
    };
    const tingkatKesulitan2 = {
        mudah: (parseInt(data.mudah2) / 100) * soalPerBab.bab2,
        sedang: (parseInt(data.sedang2) / 100) * soalPerBab.bab2,
        sulit: (parseInt(data.sulit2) / 100) * soalPerBab.bab2,
    };
    const tingkatKesulitan3 = {
        mudah: (parseInt(data.mudah3) / 100) * soalPerBab.bab3,
        sedang: (parseInt(data.sedang3) / 100) * soalPerBab.bab3,
        sulit: (parseInt(data.sulit3) / 100) * soalPerBab.bab3,
    };

    const query = `
    SELECT * FROM soal
    WHERE mata_kuliah = ? AND
        tingkat_kesulitan IN (?, ?, ?)
    ORDER BY RAND()
    `;

    // Parameter untuk query
    const params = [
        data.mata_kuliah,
        'mudah', 'sedang', 'sulit'
    ];

    let selectedSoals = [];

    koneksi.query(query, params, (err, results) => {
        if (err) {
            console.error('Error selecting soals:', err);
        } else {
            // Distribusi soal sesuai dengan tingkat kesulitan yang diinginkan
            selectedSoals = distributeSoals(results, tingkatKesulitan1,tingkatKesulitan2,tingkatKesulitan3, jumlahSoal);

            const ujianData = {
                mata_kuliah: data.mata_kuliah,
                jenis: data.jenis,
                jumlah_soal: jumlahSoal,
                durasi: parseInt(data.durasi),
                tanggal: data.tanggal,
                jam: data.jam,
                soal: JSON.stringify(selectedSoals)
            };

            saveSelectedSoalsToUjian(ujianData);
        }
    });

    // Redirect atau berikan respons sesuai kebutuhan
    res.redirect('/');  // Ganti halaman ke dashboard
});

function distributeSoals(soals, tingkatKesulitan1,tingkatKesulitan2,tingkatKesulitan3, jumlahSoal) {
    // Hitung jumlah soal yang harus dipilih untuk masing-masing tingkat kesulitan dan bab
    const jumlahMudah = Math.ceil(tingkatKesulitan1.mudah);
    const jumlahSedang = Math.ceil(tingkatKesulitan1.sedang);
    const jumlahSulit = Math.ceil(tingkatKesulitan1.sulit);

    const jumlahMudah2 = Math.ceil(tingkatKesulitan2.mudah);
    const jumlahSedang2 = Math.ceil(tingkatKesulitan2.sedang);
    const jumlahSulit2 = Math.ceil(tingkatKesulitan2.sulit);

    const jumlahMudah3 = Math.ceil(tingkatKesulitan3.mudah);
    const jumlahSedang3 = Math.ceil(tingkatKesulitan3.sedang);
    const jumlahSulit3 =  Math.ceil(tingkatKesulitan3.sulit);

    // Pisahkan soal-soal berdasarkan tingkat kesulitan
    const mudahSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Mudah');
    const sedangSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Sedang');
    const sulitSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Sulit');
    // console.log("Jumlah = ",mudahSoals.length,sedangSoals.length,sulitSoals.length)

    // Pisahkan soal-soal berdasarkan bab dan tingkat kesulitan
    const bab1MudahSoals = soals.filter(soal => soal.bab === 'BAB 1' && soal.tingkat_kesulitan === "Mudah");
    const bab1SedangSoals = soals.filter(soal => soal.bab === 'BAB 1' && soal.tingkat_kesulitan === "Sedang");
    const bab1SulitSoals = soals.filter(soal => soal.bab === 'BAB 1' && soal.tingkat_kesulitan === "Sulit");
    const bab2MudahSoals = soals.filter(soal => soal.bab === 'BAB 2' && soal.tingkat_kesulitan === "Mudah");
    const bab2SedangSoals = soals.filter(soal => soal.bab === 'BAB 2' && soal.tingkat_kesulitan === "Sedang");
    const bab2SulitSoals = soals.filter(soal => soal.bab === 'BAB 2' && soal.tingkat_kesulitan === "Sulit");
    const bab3MudahSoals = soals.filter(soal => soal.bab === 'BAB 3' && soal.tingkat_kesulitan === "Mudah");
    const bab3SedangSoals = soals.filter(soal => soal.bab === 'BAB 3' && soal.tingkat_kesulitan === "Sedang");
    const bab3SulitSoals = soals.filter(soal => soal.bab === 'BAB 3' && soal.tingkat_kesulitan === "Sulit");

    if (mudahSoals.length < jumlahMudah || sedangSoals.length < jumlahSedang || sulitSoals.length < jumlahSulit) {
        console.error('Tidak cukup soal untuk memenuhi persyaratan kesulitan.');
        // return [];
    }

    // Ambil jumlah soal sesuai dengan kriteria
    const selectedMudahSoals = bab1MudahSoals.splice(0, jumlahMudah);
    const selectedSedangSoals = bab1SedangSoals.splice(0, jumlahSedang);
    const selectedSulitSoals = bab1SulitSoals.splice(0, jumlahSulit);

    const selectedMudahSoals2 = bab2MudahSoals.splice(0, jumlahMudah2);
    const selectedSedangSoals2 = bab2SedangSoals.splice(0, jumlahSedang2);
    const selectedSulitSoals2 = bab2SulitSoals.splice(0, jumlahSulit2);

    const selectedMudahSoals3 = bab3MudahSoals.splice(0, jumlahMudah3);
    const selectedSedangSoals3 = bab3SedangSoals.splice(0, jumlahSedang3);
    const selectedSulitSoals3 = bab3SulitSoals.splice(0, jumlahSulit3);

    // Gabungkan soal-soal yang terpilih dari masing-masing tingkat kesulitan
    let selectedSoals = [
        ...selectedMudahSoals,
        ...selectedSedangSoals,
        ...selectedSulitSoals,
        ...selectedMudahSoals2,
        ...selectedSedangSoals2,
        ...selectedSulitSoals2,
        ...selectedMudahSoals3,
        ...selectedSedangSoals3,
        ...selectedSulitSoals3,
    ];
    console.log("selectedSoals panjang = ",selectedSoals.length)

    // kurangi jumlah soal jika melebihi dari yang dibutuhkan
    if (selectedSoals.length > jumlahSoal){
        let selisih = selectedSoals.length - jumlahSoal;
        selectedSoals.splice(selectedSoals.length - selisih, selisih);
    }

    return selectedSoals;
}

  
// Fungsi untuk menyimpan soal ke tabel "ujian"
function saveSelectedSoalsToUjian(ujianData) {
    // Query untuk menyimpan soal ke dalam tabel "ujian"
    const query = 'INSERT INTO ujian SET ?';

    koneksi.query(query, ujianData, (err, results) => {
        if (err) {
        console.error('Error saving ujian:', err);
        } else {
        console.log('Saved ujian to database:', results);
        }
    });
}
  
  
app.get('/soal', (req, res) => {

    const querySql = 'SELECT * FROM soal';

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        // const dataFromDatabase = [
        //     { id: 1, name: 'Item 1', price: 10 },
        //     { id: 2, name: 'Item 2', price: 20 },
        //     // ...
        // ];
        rows.forEach(row=>{
            dataFromDatabase.push(row)
        })
        res.render('soal', { title: 'Node.js EJS Tutorial',data: dataFromDatabase });
    });

});

app.get('/tambahSoal', (req, res) => {
    res.render('tambahSoal', { title: 'Tambah Soal Page' });
});

app.post('/tambahSoal', (req, res) => {
    // Tangani data yang diterima dari formulir di sini

    // Simpan data ke database atau lakukan operasi lainnya
    // buat variabel penampung data dan query sql
    const data = { ...req.body };
    const querySql = 'INSERT INTO soal SET ?';

    // jalankan query
    koneksi.query(querySql, data, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Gagal insert data mahasiswa!', error: err });
        }

        // jika request berhasil
        // res.status(201).json({ success: true, message: 'Berhasil insert data mahasiswa!' });
        res.redirect('/soal');
    });
});

app.get('/students', (req, res) => {
    // buat query sql
    const querySql = 'SELECT * FROM mahasiswa';
    console.log('Ini GET' );

    // jalankan query
    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        res.status(200).json({ success: true, data: rows });
    });
});

// app.get('/soal', (req, res) => {
//     // Buat query SQL
//     const querySql = 'SELECT * FROM soal';
  
//     // Jalankan query
//     koneksi.query(querySql, (err, rows, fields) => {
//       if (err) {
//         return res.status(500).json({ message: 'Ada kesalahan', error: err });
//       }
  
//       // Baca file soal.html
//       fs.readFile('soal.html', (err, data) => {
//         if (err) {
//           res.writeHead(500, { 'Content-Type': 'text/html' });
//           res.end('Internal Server Error');
//         } else {
//           // Gabungkan form HTML dengan data mahasiswa
//           const html = data.toString().replace('{{soal}}', renderSoalList(rows));
  
//           res.writeHead(200, { 'Content-Type': 'text/html' });
//           res.end(html);
//         }
//       });
//     });
//   });

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

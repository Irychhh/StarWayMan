import axios from "axios";

// 1. Отсутствие обработки ошибок: Например, для случаев, когда запросы к API неуспешны.
// 2. Несколько одинаковых запросов на случайные изображения, что избыточно.
// 3. Синхронность вызовов API: код выполняет некоторые действия асинхронно, что может привести к проблемам - например, при создании папки перед проверкой и загрузкой картинок.
// 4. Запросы для каждой подпороды: множественные запросы для каждой подпороды отдельно, что может привести к увеличению времени выполнения и лишней нагрузке.
// 5. Неинициализированные переменные: allUrls и allSubBreeds используются глобально без явной необходимости, что не рекомендуется.
// 6. В методе createFolder нет проверки существования папки до ее создания, что может привести к конфликтам.
// 7. Плохая структура кода: метод u вызывает метод fetchSubBreeds, который в свою очередь вызывает fetchUrls. Сложно для понимания и поддержки.
// 8. Неинформативный нейминг функций: t, u.
// 9. Переменные объявлены с типом any: использование типа any не дает типовому анализатору возможности поймать ошибки типизации.
// 10. Захардкоженные значения токена и пути: токен и пути заданы в коде, что небезопасно.

class YaUploader {
    createFolder(path: string, token: string) {
        const urlCreate = 'https://cloud-api.yandex.net/v1/disk/resources';
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `OAuth ${token}`,
        };

        return axios.put(`${urlCreate}?path=${path}`, {}, { headers }).then(() => {
            console.log("Folder created");
        }).catch(err => {
            if (err.response?.status === 409) {
                console.log("Folder already exists");
            } else {
                console.error("Failed to create folder", err);
                throw err;
            }
        });
    }

    uploadPhotoToYd(token: string, path: string, urlFile: string, name: string) {
        const url = "https://cloud-api.yandex.net/v1/disk/resources/upload";
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `OAuth ${token}`,
        };
        const params = {
            path: `/${path}/${name}`,
            url: urlFile,
            overwrite: "true"
        };

        return axios.post(url, {}, { headers, params }).then(() => {
            console.log(`Uploaded: ${name}`);
        }).catch(err => {
            console.error(`Failed to upload: ${name}`, err);
            throw err;
        });
    }
}

function fetchSubBreeds(breed: string) {
    return axios.get(`https://dog.ceo/api/breed/${breed}/list`).then(res => {
        return res.data.message || [];
    }).catch(err => {
        console.error("Failed to fetch sub-breeds", err);
        throw err;
    });
}

function fetchRandomImage(breed: string, subBreed?: string) {
    const url = subBreed
        ? `https://dog.ceo/api/breed/${breed}/${subBreed}/images/random`
        : `https://dog.ceo/api/breed/${breed}/images/random`;

    return axios.get(url).then(res => res.data.message).catch(err => {
        console.error("Failed to fetch image URL", err);
        throw err;
    });
}

// @ts-ignore
async function uploadDogImages(token: string, folderPath: string, breed: string) {
    const yandexClient = new YaUploader();

    await yandexClient.createFolder(folderPath, token);

    const subBreeds = await fetchSubBreeds(breed);

    const imagePromises = subBreeds.length > 0
        ? subBreeds.map(subBreed => fetchRandomImage(breed, subBreed))
        : [await fetchRandomImage(breed)];

    // @ts-ignore
    const images = await Promise.all(imagePromises);

    // @ts-ignore
    await Promise.all(images.map((url, index) => {
        const name = `image_${index + 1}.jpg`;
        return yandexClient.uploadPhotoToYd(token, folderPath, url, name);
    }));
}

const breeds = ['doberman', 'bulldog', 'collie'];
const randomBreed = breeds[Math.floor(Math.random() * breeds.length)];
const token = "AgAAAAAJtest_tokenxkUEdew";
const folderPath = "test_folder";

uploadDogImages(token, folderPath, randomBreed).then(() => {
    console.log("All images uploaded successfully");
}).catch(err => {
    console.error("Failed to upload images", err);
});

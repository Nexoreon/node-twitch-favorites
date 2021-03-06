module.exports = fn => { // Отвечает за обработку ошибок и дальшейшего отсыла их в middleware отсыла ошибок. Получает функцию и добавляет к ней catch и в случае ошибок отсылает ошибку через next()
    return (req, res, next) => { // Возвращаем функцию где объявлены три базовых параметра
        fn(req, res, next).catch(next) // Вся функция работает асинхронно, так что все должно работать
    }
}
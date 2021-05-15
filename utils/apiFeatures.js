class APIFeatures {
    constructor(query, queryString) {
        this.query = query
        this.queryString = queryString
    }

    filter() {
        const queryObj = {...this.queryString} // С помощью spread оператора образуем новый объект с данными из req.query
        const excParams = ['page', 'sort', 'limit', 'fields', 'offset'] // Указываем какие параметры должны быть исключены из объекта
        excParams.forEach(el => delete queryObj[el]) // Исключаем эти параметры если они существуют

        // Продвинутая фильтрация
        let queryStr = JSON.stringify(queryObj) // Превращаем объект в строку
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne)\b/g, match => `$${match}`) // Используем шаблонизацию для того чтобы в случае обнаружение одного из операторов, добавить знак $

       this.query.find(JSON.parse(queryStr))

       return this
    }

    sort() {
         if (this.queryString.sort) { // Если получаем в запросе параметр sort, то...
            const sortBy = this.queryString.sort.split(',').join(' ') // Позволяет получать сразу несколько параметров для сортировки и переопределяет их в читабельный для MongoDB формат
            this.query = this.query.sort(sortBy) // Говорим что необходимо сортировка по обработанным параметрам
        } else {
            this.query = this.query.sort('-date') // В ином случае сортируем по умолчанию в порядке создания документа
        }

        return this
    }

    limitFields() {
        if (this.queryString.fields) { // Если приходит запрос с необходимостью вывести определенные поля...
            const fields = this.queryString.fields.split(',').join(' ') // Обрабатываем указанные поля чтобы они были читабельными для MongoDB
            this.query = this.query.select(fields) // Отправляем данные с указанными строками клиенту
        } else {
            this.query = this.query.select('-__v') // В ином случае просто убираем базовые поля которые использует Mongoose
        }

        return this
    }

    paginate() {
        const page = this.queryString.page * 1 || 1 // Получаем указанную страницу в запросе. Если нету, то по умолчанию будет 1
        const limit = this.queryString.limit * 1 || 100 // Получаем лимит документов на страницу. Если нету, то по умолчанию будет 100
        const offset = this.queryString.offset * 1 || 0
        const skip = (page - 1) * limit + offset // Вымеряем сколько необходимо пропустить документов для указанной страницы

        this.query = this.query.skip(skip).limit(limit) // С помощью этих методов пропускаем указанное количество документов и ограничиваем количество показываемых

        return this
    }
}

module.exports = APIFeatures
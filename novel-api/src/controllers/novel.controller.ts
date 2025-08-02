class NovelController {
    getNovels(req, res) {
        const novels = [
            {
                title: "Default Novel Title",
                author: "Default Author",
                ratings: {
                    average: 0,
                    count: 0
                },
                stats: {
                    pages: 0,
                    published: "N/A"
                },
                comments: []
            }
        ];
        res.json(novels);
    }
}

export default NovelController;
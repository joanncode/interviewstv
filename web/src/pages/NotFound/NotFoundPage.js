class NotFoundPage {
    async render(container, props = {}) {
        container.innerHTML = `
            <div class="container py-5">
                <div class="row justify-content-center text-center">
                    <div class="col-md-6">
                        <h1 class="display-1 fw-bold text-primary">404</h1>
                        <h2 class="mb-4">Page Not Found</h2>
                        <p class="lead mb-4">
                            The page you're looking for doesn't exist or has been moved.
                        </p>
                        <div class="d-flex gap-3 justify-content-center">
                            <a href="/" class="btn btn-primary">Go Home</a>
                            <a href="/explore" class="btn btn-outline-primary">Explore Interviews</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

export default NotFoundPage;

class ExplorePage {
    async render(container, props = {}) {
        container.innerHTML = `
            <div class="container py-4">
                <div class="row">
                    <div class="col-12">
                        <h1 class="mb-4">Explore Interviews</h1>
                        <p class="lead">Discover amazing conversations and stories.</p>
                        
                        <div class="alert alert-info">
                            <h5 class="alert-heading">
                                <i class="fas fa-info-circle me-2"></i>
                                Coming Soon
                            </h5>
                            <p class="mb-0">
                                The explore page with filtering, search functionality, and interview listings 
                                will be implemented in the next development phase.
                            </p>
                        </div>
                        
                        <div class="row g-4 mt-4">
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <i class="fas fa-filter fa-3x text-primary mb-3"></i>
                                        <h5>Advanced Filtering</h5>
                                        <p class="text-muted">Filter by category, duration, popularity, and more</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <i class="fas fa-search fa-3x text-primary mb-3"></i>
                                        <h5>Smart Search</h5>
                                        <p class="text-muted">Find interviews by keywords, people, or topics</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <i class="fas fa-star fa-3x text-primary mb-3"></i>
                                        <h5>Personalized</h5>
                                        <p class="text-muted">Recommendations based on your interests</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

export default ExplorePage;

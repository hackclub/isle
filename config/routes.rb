Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  root "static_pages#index"

  namespace :slack do
    post "interactivity" => "interactivity#create"
  end

  namespace :admin do
    get "/", to: "static_pages#index", as: :root
    resources :scenes do
      member do
        post :claim
        post :unclaim
      end
    end
  end
end

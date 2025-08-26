Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  root "static_pages#index"

  namespace :slack do
    post "interactivity" => "interactivity#create"
  end

  namespace :admin do
    resources :scenes
  end
end

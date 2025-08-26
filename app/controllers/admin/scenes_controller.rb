module Admin
  class ScenesController < Admin::ApplicationController
    before_action :set_scene, only: [:show, :edit, :update, :destroy]

    def index
      @scenes = Scene.all
    end

    def show
    end

    def edit
    end

    private

    def set_scene
      @scene = Scene.find(params[:id])
    end
  end
end

class ScenesController < ApplicationController
  before_action :set_scene, except: [:index]

  def index
    @scenes = Scene.includes(:user).order(id: :asc)
  end

  def show
  end

  private

  def set_scene
    @scene = Scene.find(params[:id])
  end
end

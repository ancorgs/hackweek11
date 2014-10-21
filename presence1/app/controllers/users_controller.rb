class UsersController < ApplicationController
  before_filter :set_room

  def new
    @user = @room.users.build
  end

  def create
    @user = @room.users.create(user_params)
    session[:current_user_id] = @user.id
    redirect_to room_path(@room.name)
  end

  def update
    @user = User.find(session[:current_user_id])
    respond_to do |format|
      if @user.update(user_params)
        format.json { head :no_content }
      else
        format.json { render json: @user.errors, status: :unprocessable_entity }
      end
    end
  end

  protected

  def set_room
    @room = Room.find_by(name: params[:room_id])
  end

  def user_params
    params.require(:user).permit(:name, :last_pic, :pic_height)
  end
end

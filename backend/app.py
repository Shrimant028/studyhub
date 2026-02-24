from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['UPLOAD_FOLDER'] = 'uploads'

db = SQLAlchemy(app)



class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100))
    filename = db.Column(db.String(200))
    user_id = db.Column(db.Integer)

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.String(50))
    subject = db.Column(db.String(100))
    time = db.Column(db.String(100))
    user_id = db.Column(db.Integer)

class StudyGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100))
    user_id = db.Column(db.Integer)


with app.app_context():
    db.create_all()
    @app.route('/register', methods=['POST'])
def register():
    data = request.json
    
    username = data['username']
    password = generate_password_hash(data['password'])

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"})
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    user = User.query.filter_by(username=data['username']).first()

    if user and check_password_hash(user.password, data['password']):
        return jsonify({"message": "Login successful", "user_id": user.id})
    
    return jsonify({"message": "Invalid credentials"})
@app.route('/upload_note', methods=['POST'])
def upload_note():
    subject = request.form['subject']
    user_id = request.form['user_id']
    file = request.files['file']

    if file.filename.endswith('.pdf'):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        new_note = Note(subject=subject, filename=file.filename, user_id=user_id)
        db.session.add(new_note)
        db.session.commit()

        return jsonify({"message": "File uploaded successfully"})

    return jsonify({"message": "Only PDF allowed"})
@app.route('/notes/<subject>', methods=['GET'])
def get_notes(subject):
    notes = Note.query.filter_by(subject=subject).all()

    result = []
    for note in notes:
        result.append({
            "id": note.id,
            "subject": note.subject,
            "filename": note.filename
        })
        
        return jsonify(result)
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
@app.route('/add_schedule', methods=['POST'])
def add_schedule():
    data = request.json

    new_schedule = Schedule(
        day=data['day'],
        subject=data['subject'],
        time=data['time'],
        user_id=data['user_id']
    )

    db.session.add(new_schedule)
    db.session.commit()

    return jsonify({"message": "Schedule added"})
@app.route('/schedule/<int:user_id>', methods=['GET'])
def get_schedule(user_id):
    schedules = Schedule.query.filter_by(user_id=user_id).all()

    result = []
    for s in schedules:
        result.append({
            "day": s.day,
            "subject": s.subject,
            "time": s.time
        })

    return jsonify(result)
@app.route('/join_group', methods=['POST'])
def join_group():
    data = request.json

    new_group = StudyGroup(
        subject=data['subject'],
        user_id=data['user_id']
    )

    db.session.add(new_group)
    db.session.commit()

    return jsonify({"message": "Joined group"})
@app.route('/dashboard/<int:user_id>', methods=['GET'])
def dashboard(user_id):
    total_notes = Note.query.count()
    my_notes = Note.query.filter_by(user_id=user_id).count()
    my_groups = StudyGroup.query.filter_by(user_id=user_id).count()
    my_schedule = Schedule.query.filter_by(user_id=user_id).count()

    return jsonify({
        "total_notes": total_notes,
        "my_notes": my_notes,
        "my_groups": my_groups,
        "my_schedule_entries": my_schedule
    })

-- Created by Redgate Data Modeler (https://datamodeler.redgate-platform.com)
-- Last modification date: 2025-10-28 14:42:46.174

-- tables
-- Table: Appointment
CREATE TABLE Appointment (
    id int  NOT NULL,
    startDate date  NOT NULL,
    endDate date  NOT NULL,
    discountFee int  NULL,
    CONSTRAINT Appointment_pk PRIMARY KEY (id)
);

-- Table: Dentist
CREATE TABLE Dentist (
    id int  NOT NULL,
    Name varchar(20)  NOT NULL,
    Surname varchar(20)  NOT NULL,
    BirhDate date  NOT NULL,
    gmail varchar(40)  NOT NULL,
    password varchar(256)  NOT NULL,
    CONSTRAINT Dentist_pk PRIMARY KEY (id)
);

-- Table: Patient
CREATE TABLE Patient (
    id int  NOT NULL,
    name varchar(20)  NOT NULL,
    surname varchar(25)  NOT NULL,
    birthDate date  NOT NULL,
    Dentist int  NOT NULL,
    CONSTRAINT Patient_pk PRIMARY KEY (id)
);

-- Table: Patient_Teeth
CREATE TABLE Patient_Teeth (
    Patient int  NOT NULL,
    Tooth int  NOT NULL,
    CONSTRAINT Patient_Teeth_pk PRIMARY KEY (Patient,Tooth)
);

-- Table: Tooth
CREATE TABLE Tooth (
    id int  NOT NULL,
    number int  NOT NULL,
    permanent boolean  NOT NULL,
    upper_jaw boolean  NOT NULL,
    name varchar(30)  NOT NULL,
    CONSTRAINT Tooth_pk PRIMARY KEY (id)
);

-- Table: Tooth_Treatment
CREATE TABLE Tooth_Treatment (
    id int  NOT NULL,
    patient int  NOT NULL,
    tooth int  NOT NULL,
    treatment int  NOT NULL,
    appointment int  NOT NULL,
    description varchar(300)  NULL,
    CONSTRAINT Tooth_Treatment_pk PRIMARY KEY (id)
);

-- Table: Treatment
CREATE TABLE Treatment (
    id int  NOT NULL,
    name varchar(40)  NOT NULL,
    price int  NOT NULL,
    description varchar(300)  NOT NULL,
    CONSTRAINT Treatment_pk PRIMARY KEY (id)
);

-- foreign keys
-- Reference: Patient_Dentist (table: Patient)
ALTER TABLE Patient ADD CONSTRAINT Patient_Dentist
    FOREIGN KEY (Dentist)
    REFERENCES Dentist (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Patient_Teeth_Patient (table: Patient_Teeth)
ALTER TABLE Patient_Teeth ADD CONSTRAINT Patient_Teeth_Patient
    FOREIGN KEY (Patient)
    REFERENCES Patient (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Patient_Teeth_Tooth (table: Patient_Teeth)
ALTER TABLE Patient_Teeth ADD CONSTRAINT Patient_Teeth_Tooth
    FOREIGN KEY (Tooth)
    REFERENCES Tooth (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Tooth_Treatment_Appointment (table: Tooth_Treatment)
ALTER TABLE Tooth_Treatment ADD CONSTRAINT Tooth_Treatment_Appointment
    FOREIGN KEY (appointment)
    REFERENCES Appointment (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Tooth_Treatment_Patient_Teeth (table: Tooth_Treatment)
ALTER TABLE Tooth_Treatment ADD CONSTRAINT Tooth_Treatment_Patient_Teeth
    FOREIGN KEY (patient, tooth)
    REFERENCES Patient_Teeth (Patient, Tooth)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Tooth_Treatment_Treatment (table: Tooth_Treatment)
ALTER TABLE Tooth_Treatment ADD CONSTRAINT Tooth_Treatment_Treatment
    FOREIGN KEY (treatment)
    REFERENCES Treatment (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- End of file.


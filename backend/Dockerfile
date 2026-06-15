# Stage 1: Build the Java application using Maven with Java 21
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
# Build the project
RUN ./mvnw clean package -DskipTests

# Stage 2: Create a lightweight runtime image with Java 21
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]